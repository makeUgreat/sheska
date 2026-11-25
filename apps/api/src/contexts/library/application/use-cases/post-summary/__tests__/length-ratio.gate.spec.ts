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

  it('본문에 산문이 없으면 실패한다', () => {
    const draft = buildDraft({ body: '```ts\nconst a = 1;\n```', sentences: ['나'] });

    expect(gate.judge(draft)).toEqual({ passed: false, explanation: '산문 없음 (요약할 산문이 있어야 함)' });
  });
});

function buildDraft(overrides: Partial<PostSummaryDraft>): PostSummaryDraft {
  return { body: '', text: '', model: 'claude-haiku-5-5', finishReason: 'completed', sentences: [], ...overrides };
}
