import { describe, expect, it, vi } from 'vitest';
import { RateLimitedError, UnauthenticatedError } from '@core/errors';
import {
  type LoginAttempt,
  type LoginAttemptCounter,
  type OwnerPasswordVerifier,
  type SessionStore,
} from '@contexts/iam/application/ports';
import { LoginAttemptPolicy } from '@contexts/iam/domain';
import { LogInUseCase } from '../log-in.use-case';

const CLIENT_ADDRESS = '203.0.113.7';
const EXPIRES_AT = new Date('2026-12-18T00:00:00.000Z');

function setup(options: { passwordMatches: boolean; attempt?: LoginAttempt }) {
  const ownerPassword = {
    matches: vi.fn().mockResolvedValue(options.passwordMatches),
  } satisfies OwnerPasswordVerifier;
  const sessions = {
    issue: vi.fn().mockResolvedValue({ token: 'session-token', expiresAt: EXPIRES_AT }),
    isActive: vi.fn(),
    revoke: vi.fn(),
  } satisfies SessionStore;
  const attempts = {
    register: vi.fn().mockResolvedValue(options.attempt ?? { attemptNumber: 1, retryAfterSeconds: 300 }),
    clear: vi.fn(),
  } satisfies LoginAttemptCounter;

  const useCase = new LogInUseCase(ownerPassword, sessions, attempts);
  return { useCase, ownerPassword, sessions, attempts };
}

describe('LogInUseCase', () => {
  it('비밀번호가 맞으면 30일짜리 세션을 발급한다', async () => {
    const { useCase, sessions } = setup({ passwordMatches: true });

    await expect(useCase.execute({ password: 'secret', clientAddress: CLIENT_ADDRESS })).resolves.toEqual({
      sessionToken: 'session-token',
      expiresAt: EXPIRES_AT,
    });
    expect(sessions.issue).toHaveBeenCalledWith(30 * 24 * 60 * 60);
  });

  it('비밀번호를 확인하기 전에 그 IP의 시도를 센다', async () => {
    const { useCase, attempts, ownerPassword } = setup({
      passwordMatches: true,
    });

    await useCase.execute({
      password: 'secret',
      clientAddress: CLIENT_ADDRESS,
    });

    expect(attempts.register).toHaveBeenCalledWith(CLIENT_ADDRESS, LoginAttemptPolicy.STANDARD);
    expect(attempts.register.mock.invocationCallOrder[0]).toBeLessThan(ownerPassword.matches.mock.invocationCallOrder[0]);
  });

  it('비밀번호가 맞으면 그 IP의 시도 기록을 지운다', async () => {
    const { useCase, attempts } = setup({
      passwordMatches: true,
      attempt: { attemptNumber: 4, retryAfterSeconds: 200 },
    });

    await useCase.execute({
      password: 'secret',
      clientAddress: CLIENT_ADDRESS,
    });

    expect(attempts.clear).toHaveBeenCalledWith(CLIENT_ADDRESS);
  });

  it('비밀번호가 틀리면 auth.invalid_credentials로 거부하고 기록을 남긴다', async () => {
    const { useCase, sessions, attempts } = setup({ passwordMatches: false });

    const result = useCase.execute({
      password: 'wrong',
      clientAddress: CLIENT_ADDRESS,
    });

    await expect(result).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(result).rejects.toMatchObject({
      code: 'auth.invalid_credentials',
    });
    expect(sessions.issue).not.toHaveBeenCalled();
    expect(attempts.clear).not.toHaveBeenCalled();
  });

  it('한도를 넘은 시도는 비밀번호를 확인하지 않고 남은 시간과 함께 거부한다', async () => {
    const { useCase, ownerPassword } = setup({
      passwordMatches: true,
      attempt: {
        attemptNumber: LoginAttemptPolicy.STANDARD.maxFailures + 1,
        retryAfterSeconds: 240,
      },
    });

    const result = useCase.execute({
      password: 'secret',
      clientAddress: CLIENT_ADDRESS,
    });

    await expect(result).rejects.toBeInstanceOf(RateLimitedError);
    await expect(result).rejects.toMatchObject({
      code: 'auth.too_many_attempts',
      details: { retryAfterSeconds: 240 },
    });
    expect(ownerPassword.matches).not.toHaveBeenCalled();
  });
});
