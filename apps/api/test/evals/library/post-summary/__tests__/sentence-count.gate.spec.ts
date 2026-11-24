import { describe, expect, it } from 'vitest';
import { SENTENCE_COUNT_GATE } from '../sentence-count.gate';

const sentencesOf = (count: number) => Array.from({ length: count }, (_, index) => `${index + 1}번째 문장이다.`);

describe('SENTENCE_COUNT_GATE', () => {
  it('1문장이면 통과한다', () => {
    expect(SENTENCE_COUNT_GATE.judge(sentencesOf(1))).toEqual({ passed: true, explanation: '1문장' });
  });

  it('5문장이면 통과한다', () => {
    expect(SENTENCE_COUNT_GATE.judge(sentencesOf(5))).toEqual({ passed: true, explanation: '5문장' });
  });

  it('문장이 없으면 실패한다', () => {
    expect(SENTENCE_COUNT_GATE.judge([])).toEqual({ passed: false, explanation: '0문장' });
  });

  it('6문장이면 실패한다', () => {
    expect(SENTENCE_COUNT_GATE.judge(sentencesOf(6))).toEqual({ passed: false, explanation: '6문장' });
  });
});
