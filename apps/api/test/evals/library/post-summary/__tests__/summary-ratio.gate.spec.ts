import { describe, expect, it } from 'vitest';
import { SUMMARY_RATIO_GATE } from '../summary-ratio.gate';

const body = '가'.repeat(100);

describe('SUMMARY_RATIO_GATE', () => {
  it('요약이 산문의 40% 이하면 통과한다', () => {
    expect(SUMMARY_RATIO_GATE.judge({ body, sentences: ['나'.repeat(20), '다'.repeat(20)] })).toEqual({
      passed: true,
      explanation: '요약 40자 / 산문 100자 = 40%',
    });
  });

  it('요약이 산문의 40%를 넘으면 실패한다', () => {
    expect(SUMMARY_RATIO_GATE.judge({ body, sentences: ['나'.repeat(41)] })).toEqual({
      passed: false,
      explanation: '요약 41자 / 산문 100자 = 41%',
    });
  });

  it('코드 블록은 산문 길이에 넣지 않는다', () => {
    const bodyWithCode = `${body}\n\`\`\`ts\n${'x'.repeat(1000)}\n\`\`\``;

    expect(SUMMARY_RATIO_GATE.judge({ body: bodyWithCode, sentences: ['나'.repeat(41)] }).passed).toBe(false);
  });
});
