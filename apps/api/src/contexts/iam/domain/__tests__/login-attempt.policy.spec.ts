import { describe, expect, it } from 'vitest';
import { LoginAttemptPolicy } from '../login-attempt.policy';

describe('LoginAttemptPolicy', () => {
  const policy = new LoginAttemptPolicy({
    maxFailures: 3,
    windowSeconds: 60,
    lockSeconds: 600,
  });

  it('한도 번째 시도까지 받는다', () => {
    expect(policy.allows(3)).toBe(true);
  });

  it('한도를 넘은 시도는 받지 않는다', () => {
    expect(policy.allows(4)).toBe(false);
  });

  it('기본 정책은 5분 동안 5번 틀리면 5분 동안 잠근다', () => {
    expect(LoginAttemptPolicy.STANDARD).toMatchObject({
      maxFailures: 5,
      windowSeconds: 5 * 60,
      lockSeconds: 5 * 60,
    });
  });
});
