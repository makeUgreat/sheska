import { describe, expect, it } from 'vitest';
import { type PostSummaryDraft } from '../generate-post-summary.prompt';
import { SentenceCountGate } from '../sentence-count.gate';

const sentencesOf = (count: number) => Array.from({ length: count }, (_, index) => `${index + 1}번째 문장이다.`);

const gate = new SentenceCountGate({ min: 1, max: 5 });

describe('SentenceCountGate', () => {
  it('1문장이면 통과한다', () => {
    expect(gate.judge(buildDraft({ sentences: sentencesOf(1) }))).toEqual({ passed: true, explanation: '1문장 (1~5문장이어야 함)' });
  });

  it('5문장이면 통과한다', () => {
    expect(gate.judge(buildDraft({ sentences: sentencesOf(5) }))).toEqual({ passed: true, explanation: '5문장 (1~5문장이어야 함)' });
  });

  it('문장이 없으면 실패한다', () => {
    expect(gate.judge(buildDraft({ sentences: [] }))).toEqual({ passed: false, explanation: '0문장 (1~5문장이어야 함)' });
  });

  it('6문장이면 실패한다', () => {
    expect(gate.judge(buildDraft({ sentences: sentencesOf(6) }))).toEqual({ passed: false, explanation: '6문장 (1~5문장이어야 함)' });
  });

  it('최소와 최대가 같으면 그 수 하나를 기대값으로 알린다', () => {
    expect(new SentenceCountGate({ min: 1, max: 1 }).judge(buildDraft({ sentences: sentencesOf(2) }))).toEqual({
      passed: false,
      explanation: '2문장 (1문장이어야 함)',
    });
  });
});

function buildDraft(overrides: Partial<PostSummaryDraft>): PostSummaryDraft {
  return { body: '', text: '', model: 'claude-haiku-5-5', finishReason: 'completed', sentences: [], ...overrides };
}
