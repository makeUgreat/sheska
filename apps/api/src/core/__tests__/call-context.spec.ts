import { describe, expect, it } from 'vitest';
import { callContext } from '../call-context';

describe('callContext', () => {
  it('call policy의 상대 deadlineMs로 절대 deadline을 만들고 maxRetries를 그대로 전달한다', () => {
    const context = callContext({ deadlineMs: 5_000, maxRetries: 2 }, 10_000);

    expect(context).toEqual({
      deadline: { deadlineAt: 15_000 },
      maxRetries: 2,
    });
  });
});
