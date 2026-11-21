import { describe, expect, it } from 'vitest';
import { toPostSummaryRequest, toPostSummarySentences } from '../generate-post-summary.prompt';

describe('toPostSummaryRequest', () => {
  it('본문을 post 태그로 감싸 입력으로 보낸다', () => {
    const request = toPostSummaryRequest('# 제목\n본문');

    expect(request.input).toBe('<post>\n# 제목\n본문\n</post>');
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
