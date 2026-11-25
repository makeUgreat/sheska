import { describe, expect, it } from 'vitest';
import { type PostSummaryDraft } from '../generate-post-summary.prompt';
import { LengthRatioGate } from '../length-ratio.gate';

const BODY = '가'.repeat(100);

const gate = new LengthRatioGate({ maxPercent: 40 });

describe('LengthRatioGate', () => {
  it('기준이 0~100 정수가 아니면 만들 때 던진다', () => {
    expect(() => new LengthRatioGate({ maxPercent: 0.4 })).toThrow('maxPercent must be an integer from 0 to 100: 0.4');
  });

  it('요약이 산문의 40% 이하면 통과한다', () => {
    const draft = buildDraft({ body: BODY, sentences: ['나'.repeat(20), '다'.repeat(20)] });

    expect(gate.judge(draft)).toEqual({ passed: true, explanation: '요약 40자 / 산문 100자 = 40% (40% 이하여야 함)' });
  });

  it('요약이 산문의 40%를 넘으면 실패한다', () => {
    const draft = buildDraft({ body: BODY, sentences: ['나'.repeat(41)] });

    expect(gate.judge(draft)).toEqual({ passed: false, explanation: '요약 41자 / 산문 100자 = 41% (40% 이하여야 함)' });
  });

  it('요약 비율이 기준과 정확히 같으면 통과한다', () => {
    const draft = buildDraft({ body: BODY, sentences: ['나'.repeat(7)] });

    expect(new LengthRatioGate({ maxPercent: 7 }).judge(draft)).toEqual({
      passed: true,
      explanation: '요약 7자 / 산문 100자 = 7% (7% 이하여야 함)',
    });
  });

  it.each([
    { name: '코드 블록을 세지 않는다', body: '가나다\n```ts\nconst a = 1;\n```\n라마', prose: '가나다 라마' },
    { name: '헤딩 줄을 세지 않는다', body: '# 제목\n본문', prose: '본문' },
    { name: '링크는 보이는 글자만 센다', body: '[RFC 7396](https://example.com)와 [[노트|별칭]]', prose: 'RFC 7396와 별칭' },
    { name: '이미지 임베드를 세지 않는다', body: '앞 ![[image.png]] ![alt](a.png) 뒤', prose: '앞 뒤' },
    { name: '연속된 공백은 한 칸으로 센다', body: '가\n\n\n나   다', prose: '가 나 다' },
  ])('산문 길이는 $name', ({ body, prose }) => {
    const draft = buildDraft({ body, sentences: ['나'] });

    expect(gate.judge(draft).explanation).toContain(`산문 ${prose.length}자`);
  });
});

function buildDraft(overrides: Partial<PostSummaryDraft>): PostSummaryDraft {
  return { body: '', text: '', model: 'claude-haiku-5-5', finishReason: 'completed', sentences: [], ...overrides };
}
