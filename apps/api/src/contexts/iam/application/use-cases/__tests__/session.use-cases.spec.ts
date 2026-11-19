import { describe, expect, it, vi } from 'vitest';
import { type SessionStore } from '@contexts/iam/application/ports';
import { GetSessionUseCase } from '../get-session.use-case';
import { LogOutUseCase } from '../log-out.use-case';

function buildSessions(active: boolean) {
  return {
    issue: vi.fn(),
    isActive: vi.fn().mockResolvedValue(active),
    revoke: vi.fn(),
  } satisfies SessionStore;
}

describe('GetSessionUseCase', () => {
  it('유효한 세션 토큰이면 로그인한 상태다', async () => {
    const useCase = new GetSessionUseCase(buildSessions(true));

    await expect(useCase.execute({ sessionToken: 'session-token' })).resolves.toEqual({ authenticated: true });
  });

  it('만료되거나 없는 세션 토큰이면 로그인하지 않은 상태다', async () => {
    const useCase = new GetSessionUseCase(buildSessions(false));

    await expect(useCase.execute({ sessionToken: 'session-token' })).resolves.toEqual({ authenticated: false });
  });

  it('세션 토큰이 없으면 저장소를 조회하지 않는다', async () => {
    const sessions = buildSessions(true);
    const useCase = new GetSessionUseCase(sessions);

    await expect(useCase.execute({ sessionToken: null })).resolves.toEqual({
      authenticated: false,
    });
    expect(sessions.isActive).not.toHaveBeenCalled();
  });
});

describe('LogOutUseCase', () => {
  it('세션 토큰의 세션을 지운다', async () => {
    const sessions = buildSessions(true);

    await new LogOutUseCase(sessions).execute({
      sessionToken: 'session-token',
    });

    expect(sessions.revoke).toHaveBeenCalledWith('session-token');
  });

  it('세션 토큰이 없으면 아무것도 지우지 않는다', async () => {
    const sessions = buildSessions(true);

    await new LogOutUseCase(sessions).execute({ sessionToken: null });

    expect(sessions.revoke).not.toHaveBeenCalled();
  });
});
