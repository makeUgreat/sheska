import { describe, expect, it, vi } from 'vitest';
import { callContext } from '@core/call-context';
import { InputTooLargeError, UnavailableError } from '@core/errors';
import { type PostQueryResult, type TextGenerationResult } from '@contexts/library/application/ports';
import { PostSummary, SourceFingerprint } from '@contexts/library/domain';
import { GeneratePostSummaryUseCase } from '../generate-post-summary.use-case';

const BODY = [
  '# Outbox',
  '이벤트를 트랜잭션과 함께 저장한다. 별도 relay가 저장한 이벤트를 읽어 메시지 브로커로 보낸다.',
  '전송에 실패하면 다음 주기에 다시 보내므로 이벤트가 사라지지 않는다.',
].join('\n');
const CONTEXT = callContext({ deadlineMs: 60_000, maxRetries: 0 });
const PROMPT = { instructions: '<role>요약 도구</role>\n<sentence_limit>{{sentence_limit}}</sentence_limit>', maxOutputTokens: 1_024 };

describe('GeneratePostSummaryUseCase', () => {
  it('본문을 요약해 완료한 요약으로 저장한다', async () => {
    const { useCase, generator, summaries } = setup({
      result: completedResult('<sentence>이벤트 유실을 막는 방법을 설명함</sentence>'),
    });

    const result = await useCase.execute({ postId: 'post-1' }, CONTEXT);

    expect(result).toEqual({ outcome: 'completed' });
    expect(generator.generate).toHaveBeenCalledWith(
      expect.objectContaining({ input: [{ role: 'user', content: `<post>\n${BODY}\n</post>` }] }),
      CONTEXT,
    );
    expect(savedSummary(summaries).getProps()).toMatchObject({
      fingerprint: SourceFingerprint.ofBody(BODY),
      outcome: { kind: 'completed', sentences: ['이벤트 유실을 막는 방법을 설명함'], model: 'claude-haiku-5-5' },
    });
  });

  it('주입받은 프롬프트의 지침과 출력 토큰 상한으로 요청한다', async () => {
    const { useCase, generator } = setup();

    await useCase.execute({ postId: 'post-1' }, CONTEXT);

    expect(generator.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: '<role>요약 도구</role>\n<sentence_limit>1</sentence_limit>',
        maxOutputTokens: PROMPT.maxOutputTokens,
      }),
      CONTEXT,
    );
  });

  it('post가 없으면 생성하지 않고 건너뛴다', async () => {
    const { useCase, generator, summaries } = setup({ posts: [null] });

    const result = await useCase.execute({ postId: 'post-1' }, CONTEXT);

    expect(result).toEqual({ outcome: 'skipped' });
    expect(generator.generate).not.toHaveBeenCalled();
    expect(summaries.upsert).not.toHaveBeenCalled();
  });

  // nocap: library-summary-3
  it('같은 본문의 완료한 요약이 있으면 생성하지 않고 건너뛴다', async () => {
    const existing = PostSummary.complete({
      postId: 'post-1',
      fingerprint: SourceFingerprint.ofBody(BODY),
      sentences: ['이미 만든 요약임'],
      model: 'claude-haiku-5-5',
      finishedAt: new Date(),
    });
    const { useCase, generator, summaries } = setup({ existing });

    const result = await useCase.execute({ postId: 'post-1' }, CONTEXT);

    expect(result).toEqual({ outcome: 'skipped' });
    expect(generator.generate).not.toHaveBeenCalled();
    expect(summaries.upsert).not.toHaveBeenCalled();
  });

  // nocap: library-summary-3
  it('같은 본문의 실패한 요약이 있으면 다시 생성한다', async () => {
    const existing = PostSummary.fail({ postId: 'post-1', fingerprint: SourceFingerprint.ofBody(BODY), finishedAt: new Date() });
    const { useCase, summaries } = setup({ existing, result: completedResult('<sentence>다시 만든 요약임</sentence>') });

    const result = await useCase.execute({ postId: 'post-1' }, CONTEXT);

    expect(result).toEqual({ outcome: 'completed' });
    expect(savedSummary(summaries).getProps().outcome).toMatchObject({ kind: 'completed', sentences: ['다시 만든 요약임'] });
  });

  // nocap: library-summary-5
  it.each([
    {
      name: '응답이 잘리면',
      result: { text: '<sentence>잘린', model: 'claude-haiku-5-5', finishReason: 'truncated' } as const,
      explanation: 'truncated',
    },
    {
      name: '모델이 거부하면',
      result: { text: '', model: 'claude-haiku-5-5', finishReason: 'refused' } as const,
      explanation: 'refused',
    },
  ])('$name 다시 생성하지 않고 실패한 요약으로 저장하며 걸린 게이트를 남긴다', async ({ result: generated, explanation }) => {
    const { useCase, generator, summaries, logger } = setup({ result: generated });

    const result = await useCase.execute({ postId: 'post-1' }, CONTEXT);

    expect(result).toEqual({ outcome: 'failed' });
    expect(savedSummary(summaries).getProps().outcome).toEqual({ kind: 'failed' });
    expect(logger.warn).toHaveBeenCalledWith('Post summary generation failed', {
      postId: 'post-1',
      reason: 'rejected',
      gate: 'completed',
      explanation,
    });
    expect(generator.generate).toHaveBeenCalledOnce();
  });

  // nocap: library-summary-7
  it.each([
    { name: '꺼낼 문장이 없으면', text: '요약할 수 없음', explanation: '0문장 (1문장이어야 함)' },
    {
      name: '문장이 너무 많으면',
      text: '<sentence>하나임</sentence><sentence>둘임</sentence><sentence>셋임</sentence><sentence>넷임</sentence><sentence>다섯임</sentence><sentence>여섯임</sentence>',
      explanation: '6문장 (1문장이어야 함)',
    },
  ])('$name 두 번 더 생성해 보고 모두 걸리면 실패한 요약으로 저장한다', async ({ text, explanation }) => {
    const { useCase, generator, summaries, logger } = setup({ result: completedResult(text) });

    const result = await useCase.execute({ postId: 'post-1' }, CONTEXT);

    expect(result).toEqual({ outcome: 'failed' });
    expect(savedSummary(summaries).getProps().outcome).toEqual({ kind: 'failed' });
    expect(logger.warn).toHaveBeenCalledWith('Post summary generation failed', {
      postId: 'post-1',
      reason: 'rejected',
      gate: 'sentence-count',
      explanation,
    });
    expect(generator.generate).toHaveBeenCalledTimes(3);
  });

  // nocap: library-summary-7
  it('요약이 본문에 비해 너무 길면 다시 생성해 보고 모두 걸리면 실패한 요약으로 저장한다', async () => {
    const { useCase, generator, logger } = setup({ result: completedResult(`<sentence>${'요약'.repeat(30)}</sentence>`) });

    const result = await useCase.execute({ postId: 'post-1' }, CONTEXT);

    expect(result).toEqual({ outcome: 'failed' });
    expect(logger.warn).toHaveBeenCalledWith('Post summary generation failed', expect.objectContaining({ gate: 'length-ratio' }));
    expect(generator.generate).toHaveBeenCalledTimes(3);
  });

  it.each([
    { name: '짧은 본문', body: BODY, limit: 1 },
    { name: '긴 본문', body: `# 긴 글\n${'가'.repeat(2_000)}`, limit: 5 },
  ])('$name이면 본문 길이로 계산한 최대 문장 수를 지침에 넣는다', async ({ body, limit }) => {
    const { useCase, generator } = setup({
      posts: [postResult(body), postResult(body)],
      prompt: { instructions: '<sentence_limit>{{sentence_limit}}</sentence_limit>', maxOutputTokens: 1_024 },
    });

    await useCase.execute({ postId: 'post-1' }, CONTEXT);

    expect(generator.generate).toHaveBeenCalledWith(
      expect.objectContaining({ instructions: `<sentence_limit>${limit}</sentence_limit>` }),
      CONTEXT,
    );
  });

  it('다시 생성할 때 앞선 답과 거절 사유를 대화로 이어 보낸다', async () => {
    const { useCase, generator } = setup();
    generator.generate
      .mockResolvedValueOnce(completedResult('요약할 수 없음'))
      .mockResolvedValueOnce(completedResult('<sentence>다시 만든 요약임</sentence>'));

    await useCase.execute({ postId: 'post-1' }, CONTEXT);

    expect(generator.generate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        input: [
          { role: 'user', content: `<post>\n${BODY}\n</post>` },
          { role: 'assistant', content: '요약할 수 없음' },
          { role: 'user', content: expect.stringContaining('<violation>0문장 (1문장이어야 함)</violation>') as string },
        ],
      }),
      CONTEXT,
    );
  });

  it('다시 생성한 요약이 게이트를 통과하면 완료한 요약으로 저장한다', async () => {
    const { useCase, generator, summaries } = setup();
    generator.generate
      .mockResolvedValueOnce(completedResult('요약할 수 없음'))
      .mockResolvedValueOnce(completedResult('<sentence>다시 만든 요약임</sentence>'));

    const result = await useCase.execute({ postId: 'post-1' }, CONTEXT);

    expect(result).toEqual({ outcome: 'completed' });
    expect(savedSummary(summaries).getProps().outcome).toMatchObject({ kind: 'completed', sentences: ['다시 만든 요약임'] });
    expect(generator.generate).toHaveBeenCalledTimes(2);
  });

  // nocap: library-summary-5
  it('본문에 요약할 산문이 없으면 모델을 부르지 않고 실패한 요약으로 저장한다', async () => {
    const body = '```ts\nconst a = 1;\n```';
    const { useCase, generator, summaries, logger } = setup({ posts: [postResult(body), postResult(body)] });

    const result = await useCase.execute({ postId: 'post-1' }, CONTEXT);

    expect(result).toEqual({ outcome: 'failed' });
    expect(savedSummary(summaries).getProps().outcome).toEqual({ kind: 'failed' });
    expect(logger.warn).toHaveBeenCalledWith('Post summary generation failed', { postId: 'post-1', reason: 'no_prose' });
    expect(generator.generate).not.toHaveBeenCalled();
  });

  // nocap: library-summary-5
  it('입력이 모델 한도를 넘으면 실패한 요약으로 저장한다', async () => {
    const { useCase, summaries, logger } = setup({
      error: new InputTooLargeError({ code: 'text_generator.input_too_large', message: 'Input is too large', details: {} }),
    });

    const result = await useCase.execute({ postId: 'post-1' }, CONTEXT);

    expect(result).toEqual({ outcome: 'failed' });
    expect(savedSummary(summaries).getProps().outcome).toEqual({ kind: 'failed' });
    expect(logger.warn).toHaveBeenCalledWith('Post summary generation failed', { postId: 'post-1', reason: 'input_too_large' });
  });

  it('생성기가 일시적으로 실패하면 저장하지 않고 에러를 그대로 던진다', async () => {
    const error = new UnavailableError({ code: 'text_generator.unavailable', message: 'Provider is unavailable', details: {} });
    const { useCase, summaries } = setup({ error });

    await expect(useCase.execute({ postId: 'post-1' }, CONTEXT)).rejects.toBe(error);
    expect(summaries.upsert).not.toHaveBeenCalled();
  });

  // nocap: library-summary-4
  it.each([
    { name: '본문이 바뀌면', latest: postResult('# Outbox\n바뀐 본문') },
    { name: 'post가 지워지면', latest: null },
  ])('생성하는 동안 $name 저장하지 않고 건너뛴다', async ({ latest }) => {
    const { useCase, summaries } = setup({ posts: [postResult(BODY), latest] });

    const result = await useCase.execute({ postId: 'post-1' }, CONTEXT);

    expect(result).toEqual({ outcome: 'skipped' });
    expect(summaries.upsert).not.toHaveBeenCalled();
  });
});

describe('GeneratePostSummaryUseCase.handleFailure', () => {
  // nocap: library-summary-6
  it('재시도를 모두 쓴 요약은 지금 본문의 실패한 요약으로 저장한다', async () => {
    const { useCase, summaries, logger, generator } = setup();

    await useCase.handleFailure({ postId: 'post-1' });

    expect(savedSummary(summaries).getProps()).toMatchObject({
      fingerprint: SourceFingerprint.ofBody(BODY),
      outcome: { kind: 'failed' },
    });
    expect(logger.warn).not.toHaveBeenCalled();
    expect(generator.generate).not.toHaveBeenCalled();
  });

  it('post가 없으면 저장하지 않는다', async () => {
    const { useCase, summaries } = setup({ posts: [null] });

    await useCase.handleFailure({ postId: 'post-1' });

    expect(summaries.upsert).not.toHaveBeenCalled();
  });

  it('같은 본문의 완료한 요약이 있으면 덮어쓰지 않는다', async () => {
    const existing = PostSummary.complete({
      postId: 'post-1',
      fingerprint: SourceFingerprint.ofBody(BODY),
      sentences: ['이미 만든 요약임'],
      model: 'claude-haiku-5-5',
      finishedAt: new Date(),
    });
    const { useCase, summaries } = setup({ existing });

    await useCase.handleFailure({ postId: 'post-1' });

    expect(summaries.upsert).not.toHaveBeenCalled();
  });
});

function setup(
  options: {
    posts?: (PostQueryResult | null)[];
    existing?: PostSummary | null;
    result?: TextGenerationResult;
    error?: Error;
    prompt?: typeof PROMPT;
  } = {},
) {
  const posts = { find: vi.fn() };
  for (const post of options.posts ?? [postResult(BODY), postResult(BODY)]) posts.find.mockResolvedValueOnce(post);
  const summaries = {
    find: vi.fn().mockResolvedValue(options.existing ?? null),
    upsert: vi.fn().mockImplementation((summary: PostSummary) => Promise.resolve(summary)),
  };
  const generator = {
    generate: options.error
      ? vi.fn().mockRejectedValue(options.error)
      : vi.fn().mockResolvedValue(options.result ?? completedResult('<sentence>요약 문장임</sentence>')),
  };
  const logger = { log: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
  const useCase = new GeneratePostSummaryUseCase(posts as never, summaries, generator, options.prompt ?? PROMPT, logger);

  return { useCase, generator, summaries, logger };
}

function postResult(body: string): PostQueryResult {
  return {
    postId: 'post-1',
    sourceId: 'source-1',
    title: 'Outbox',
    body,
    viewCount: 0,
    summary: { kind: 'pending' },
    series: null,
    project: null,
    createdAt: new Date('2026-11-21T00:00:00Z'),
    updatedAt: new Date('2026-11-21T00:00:00Z'),
  };
}

function completedResult(text: string): TextGenerationResult {
  return { text, model: 'claude-haiku-5-5', finishReason: 'completed' };
}

function savedSummary(summaries: { upsert: ReturnType<typeof vi.fn> }): PostSummary {
  return summaries.upsert.mock.calls[0]?.[0] as PostSummary;
}
