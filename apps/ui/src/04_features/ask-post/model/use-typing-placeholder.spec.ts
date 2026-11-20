import { describe, expect, it } from 'vitest';
import { nextTypingStep } from './use-typing-placeholder';

const PHRASES = ['ab', 'xyz'];

describe('nextTypingStep', () => {
  it('다 쓴 문구는 3.5초 보여준 뒤 지우기 시작한다', () => {
    expect(nextTypingStep({ index: 0, length: 2, erasing: false }, PHRASES)).toEqual({
      delayMs: 3500,
      next: { index: 0, length: 2, erasing: true },
    });
  });

  it('다 지우면 0.7초 쉬고 다음 문구를 처음부터 쓴다', () => {
    expect(nextTypingStep({ index: 0, length: 0, erasing: true }, PHRASES)).toEqual({
      delayMs: 700,
      next: { index: 1, length: 0, erasing: false },
    });
  });

  it('마지막 문구 다음에는 첫 문구로 돌아간다', () => {
    expect(nextTypingStep({ index: 1, length: 0, erasing: true }, PHRASES).next.index).toBe(0);
  });

  it('쓰는 중에는 한 글자씩 늘리고 지우는 중에는 한 글자씩 줄인다', () => {
    expect(nextTypingStep({ index: 1, length: 1, erasing: false }, PHRASES)).toEqual({
      delayMs: 70,
      next: { index: 1, length: 2, erasing: false },
    });
    expect(nextTypingStep({ index: 1, length: 2, erasing: true }, PHRASES)).toEqual({
      delayMs: 28,
      next: { index: 1, length: 1, erasing: true },
    });
  });
});
