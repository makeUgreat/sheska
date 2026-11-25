import { describe, expect, it } from 'vitest';
import { type TextGenerationGuardrailsRejection } from '@kernels/application';
import {
  DEFAULT_POST_SUMMARY_PROMPT,
  type PostSummaryDraft,
  toPostSummaryRequest,
  toPostSummarySentences,
  toSentenceLimit,
} from '../generate-post-summary.prompt';

describe('toPostSummaryRequest', () => {
  it('본문을 post 태그로 감싸 user 메시지 하나로 보낸다', () => {
    const request = toPostSummaryRequest('# 제목\n본문', DEFAULT_POST_SUMMARY_PROMPT, 5, []);

    expect(request.input).toEqual([{ role: 'user', content: '<post>\n# 제목\n본문\n</post>' }]);
  });

  it('받은 프롬프트의 지침과 출력 토큰 상한을 그대로 쓴다', () => {
    const request = toPostSummaryRequest(
      '본문',
      { instructions: '<role>다른 지침</role> {{sentence_limit}}', maxOutputTokens: 512 },
      5,
      [],
    );

    expect(request).toMatchObject({ instructions: '<role>다른 지침</role> 5', maxOutputTokens: 512 });
  });

  it('지침의 최대 문장 수 자리를 받은 값으로 채운다', () => {
    const prompt = { instructions: '<sentence_limit>{{sentence_limit}}</sentence_limit>', maxOutputTokens: 512 };

    const request = toPostSummaryRequest('본문', prompt, 3, []);

    expect(request.instructions).toBe('<sentence_limit>3</sentence_limit>');
  });

  it('지침에 최대 문장 수 자리가 없으면 던진다', () => {
    const prompt = { instructions: '<role>자리 없는 지침</role>', maxOutputTokens: 512 };

    expect(() => toPostSummaryRequest('본문', prompt, 3, [])).toThrow('Post summary instructions must contain {{sentence_limit}}');
  });

  it('기본 프롬프트는 최대 문장 수 자리를 두고 출력 토큰 상한은 4096이다', () => {
    expect(DEFAULT_POST_SUMMARY_PROMPT.instructions).toContain('<sentence_limit>{{sentence_limit}}</sentence_limit>');
    expect(DEFAULT_POST_SUMMARY_PROMPT.maxOutputTokens).toBe(4_096);
  });

  it('거절된 답마다 그 답과 거절 사유를 이어 붙여 다시 요청한다', () => {
    const rejected = [
      rejection(
        '<sentence>하나</sentence><sentence>둘</sentence><sentence>셋</sentence><sentence>넷</sentence>',
        'sentence-count',
        '4문장',
      ),
      rejection('<sentence>**굵다**</sentence>', 'no-markup', '1번 문장: bold'),
    ];

    const request = toPostSummaryRequest('본문', DEFAULT_POST_SUMMARY_PROMPT, 5, rejected);

    expect(request.input).toEqual([
      { role: 'user', content: '<post>\n본문\n</post>' },
      { role: 'assistant', content: '<sentence>하나</sentence><sentence>둘</sentence><sentence>셋</sentence><sentence>넷</sentence>' },
      { role: 'user', content: expect.stringContaining('<violation>4문장</violation>') as string },
      { role: 'assistant', content: '<sentence>**굵다**</sentence>' },
      { role: 'user', content: expect.stringContaining('<violation>1번 문장: bold</violation>') as string },
    ]);
  });

  it('거절된 답이 비어 있으면 그 답은 빼고 거절 사유만 이어 붙인다', () => {
    const request = toPostSummaryRequest('본문', DEFAULT_POST_SUMMARY_PROMPT, 5, [rejection('  ', 'sentence-count', '0문장')]);

    expect(request.input).toEqual([
      { role: 'user', content: '<post>\n본문\n</post>' },
      { role: 'user', content: expect.stringContaining('<violation>0문장</violation>') as string },
    ]);
  });
});

describe('toSentenceLimit', () => {
  const proseOf = (length: number) => '가'.repeat(length);

  it.each([
    [240, 1],
    [377, 2],
    [608, 3],
    [954, 4],
    [1201, 5],
  ])('산문 %i자이면 최대 %i문장이다', (length, limit) => {
    expect(toSentenceLimit(proseOf(length))).toBe(limit);
  });

  it('아주 짧은 글도 최대 1문장은 쓸 수 있다', () => {
    expect(toSentenceLimit(proseOf(10))).toBe(1);
  });

  it('긴 글도 5문장을 넘지 않는다', () => {
    expect(toSentenceLimit(proseOf(30_000))).toBe(5);
  });

  it('코드 블록은 길이에 넣지 않는다', () => {
    expect(toSentenceLimit(`${proseOf(240)}\n\`\`\`ts\n${'x'.repeat(5000)}\n\`\`\``)).toBe(1);
  });
});

describe('toPostSummarySentences', () => {
  it('sentence 태그마다 문장 하나를 꺼낸다', () => {
    const sentences = toPostSummarySentences('<sentence>첫 문장임</sentence>\n<sentence>둘째 문장임</sentence>');

    expect(sentences).toEqual(['첫 문장임', '둘째 문장임']);
  });

  it('태그 밖의 글자는 버린다', () => {
    const sentences = toPostSummarySentences('다음은 요약입니다.\n<sentence>첫 문장임</sentence>\n끝.');

    expect(sentences).toEqual(['첫 문장임']);
  });

  it('문장 앞뒤 공백을 지우고 빈 문장은 버린다', () => {
    const sentences = toPostSummarySentences('<sentence>\n  첫 문장임  \n</sentence><sentence>   </sentence>');

    expect(sentences).toEqual(['첫 문장임']);
  });

  it('sentence 태그가 없으면 빈 목록을 돌려준다', () => {
    const sentences = toPostSummarySentences('첫 문장임. 둘째 문장임.');

    expect(sentences).toEqual([]);
  });
});

function rejection(text: string, gate: string, explanation: string): TextGenerationGuardrailsRejection<PostSummaryDraft> {
  return {
    output: { text, model: 'claude-haiku-5-5', finishReason: 'completed', body: '본문', sentences: [] },
    failure: { gate, explanation },
  };
}
