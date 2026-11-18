import { describe, expect, it } from 'vitest';
import { LoginAttemptPolicy } from '../login-attempt.policy';

describe('LoginAttemptPolicy', () => {
  const policy = new LoginAttemptPolicy({
    maxFailures: 3,
    windowSeconds: 60,
    lockSeconds: 600,
  });

  it('실패가 한도보다 적으면 잠그지 않는다', () => {
    expect(policy.isLocked(2)).toBe(false);
  });

  it('실패가 한도에 닿으면 잠근다', () => {
    expect(policy.isLocked(3)).toBe(true);
  });

  it('기본 정책은 5분 동안 5번 틀리면 5분 동안 잠근다', () => {
    expect(LoginAttemptPolicy.STANDARD).toMatchObject({
      maxFailures: 5,
      windowSeconds: 5 * 60,
      lockSeconds: 5 * 60,
    });
  });
});
