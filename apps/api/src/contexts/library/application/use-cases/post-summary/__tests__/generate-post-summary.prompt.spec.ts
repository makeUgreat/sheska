import { describe, expect, it } from 'vitest';
import { type TextGenerationGuardrailsRejection } from '@kernels/application';
import {
  DEFAULT_POST_SUMMARY_PROMPT,
  type PostSummaryDraft,
  toPostSummaryRequest,
  toPostSummarySentences,
} from '../generate-post-summary.prompt';

describe('toPostSummaryRequest', () => {
  it('본문을 post 태그로 감싸 user 메시지 하나로 보낸다', () => {
    const request = toPostSummaryRequest('# 제목\n본문', DEFAULT_POST_SUMMARY_PROMPT, []);

    expect(request.input).toEqual([{ role: 'user', content: '<post>\n# 제목\n본문\n</post>' }]);
  });

  it('받은 프롬프트의 지침과 출력 토큰 상한을 그대로 쓴다', () => {
    const request = toPostSummaryRequest('본문', { instructions: '<role>다른 지침</role>', maxOutputTokens: 512 }, []);

    expect(request).toMatchObject({ instructions: '<role>다른 지침</role>', maxOutputTokens: 512 });
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

    const request = toPostSummaryRequest('본문', DEFAULT_POST_SUMMARY_PROMPT, rejected);

    expect(request.input).toEqual([
      { role: 'user', content: '<post>\n본문\n</post>' },
      { role: 'assistant', content: '<sentence>하나</sentence><sentence>둘</sentence><sentence>셋</sentence><sentence>넷</sentence>' },
      { role: 'user', content: expect.stringContaining('<violation>4문장</violation>') as string },
      { role: 'assistant', content: '<sentence>**굵다**</sentence>' },
      { role: 'user', content: expect.stringContaining('<violation>1번 문장: bold</violation>') as string },
    ]);
  });

  it('거절된 답이 비어 있으면 그 답은 빼고 거절 사유만 이어 붙인다', () => {
    const request = toPostSummaryRequest('본문', DEFAULT_POST_SUMMARY_PROMPT, [rejection('  ', 'sentence-count', '0문장')]);

    expect(request.input).toEqual([
      { role: 'user', content: '<post>\n본문\n</post>' },
      { role: 'user', content: expect.stringContaining('<violation>0문장</violation>') as string },
    ]);
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
