import { describe, expect, it } from 'vitest';
import { createCallContext } from '../call-context';

describe('createCallContext', () => {
  it('call policy로 절대 deadline과 attempt timeout을 만든다', () => {
    const context = createCallContext(
      { deadlineMs: 5_000, attemptTimeoutMs: 1_000 },
      10_000,
    );

    expect(context).toEqual({
      deadline: { deadlineAt: 15_000 },
      attemptTimeoutMs: 1_000,
    });
  });
});
