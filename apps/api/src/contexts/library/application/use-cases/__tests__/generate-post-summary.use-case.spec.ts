import { describe, expect, it, vi } from 'vitest';
import { callContext } from '@core/call-context';
import { InputTooLargeError, UnavailableError } from '@core/errors';
import { type PostQueryResult, type TextGenerationResult } from '@contexts/library/application/ports';
import { PostSummary, SourceFingerprint } from '@contexts/library/domain';
import { GeneratePostSummaryUseCase } from '../generate-post-summary.use-case';

const BODY = '# Outbox\n이벤트를 트랜잭션과 함께 저장한다.';
const CONTEXT = callContext({ deadlineMs: 60_000, maxRetries: 0 });

describe('GeneratePostSummaryUseCase', () => {
  it('본문을 요약해 완료한 요약으로 저장한다', async () => {
    const { useCase, generator, summaries } = setup({
      result: completedResult('<sentence>이벤트 유실을 막는 방법을 설명함</sentence>'),
    });

    const result = await useCase.execute({ postId: 'post-1' }, CONTEXT);

    expect(result).toEqual({ outcome: 'completed' });
    expect(generator.generate).toHaveBeenCalledWith(expect.objectContaining({ input: `<post>\n${BODY}\n</post>` }), CONTEXT);
    expect(savedSummary(summaries).getProps()).toMatchObject({
      fingerprint: SourceFingerprint.ofBody(BODY),
      outcome: { kind: 'completed', sentences: ['이벤트 유실을 막는 방법을 설명함'], model: 'claude-haiku-5-5' },
    });
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
      reason: 'truncated',
    },
    { name: '모델이 거부하면', result: { text: '', model: 'claude-haiku-5-5', finishReason: 'refused' } as const, reason: 'refused' },
    { name: '꺼낼 문장이 없으면', result: completedResult('요약할 수 없음'), reason: 'no_sentences' },
  ])('$name 실패한 요약으로 저장하고 이유를 남긴다', async ({ result: generated, reason }) => {
    const { useCase, summaries, logger } = setup({ result: generated });

    const result = await useCase.execute({ postId: 'post-1' }, CONTEXT);

    expect(result).toEqual({ outcome: 'failed' });
    expect(savedSummary(summaries).getProps().outcome).toEqual({ kind: 'failed' });
    expect(logger.warn).toHaveBeenCalledWith('Post summary generation failed', { postId: 'post-1', reason });
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
  const useCase = new GeneratePostSummaryUseCase(posts as never, summaries, generator, logger);

  return { useCase, generator, summaries, logger };
}

function postResult(body: string): PostQueryResult {
  return {
    postId: 'post-1',
    sourceId: 'source-1',
    title: 'Outbox',
    body,
    viewCount: 0,
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
