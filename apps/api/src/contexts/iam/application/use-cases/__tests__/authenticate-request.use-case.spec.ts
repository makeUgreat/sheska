import { sha256Hex } from '@core/hash';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type SessionStore } from '@contexts/iam/application/ports';
import { ApiToken, type ApiTokenRepository } from '@contexts/iam/domain';
import { AuthenticateRequestUseCase } from '../authenticate-request.use-case';

const NOW = new Date('2026-11-19T12:00:00.000Z');
const SESSION = { type: 'session', token: 'session-token' } as const;
const BEARER = { type: 'bearer', token: 'shk_secret' } as const;

function storedToken(lastUsedAt: Date | null = null) {
  return ApiToken.restore({
    id: 'token-1',
    name: 'macbook',
    secretHash: sha256Hex('shk_secret'),
    hint: 'shk_secr',
    permissions: ['sources:sync'],
    lastUsedAt,
    createdAt: new Date('2026-11-01T00:00:00.000Z'),
  });
}

function build({ sessionActive = false, token = null }: { sessionActive?: boolean; token?: ApiToken | null } = {}) {
  const sessions = {
    issue: vi.fn(),
    isActive: vi.fn().mockResolvedValue(sessionActive),
    revoke: vi.fn(),
  } satisfies SessionStore;
  const apiTokens = {
    find: vi.fn().mockResolvedValue(token),
    get: vi.fn(),
    insert: vi.fn(),
    update: vi.fn((apiToken: ApiToken) => Promise.resolve(apiToken)),
    delete: vi.fn(),
  } satisfies ApiTokenRepository;
  return {
    sessions,
    apiTokens,
    useCase: new AuthenticateRequestUseCase(sessions, apiTokens),
  };
}

describe('AuthenticateRequestUseCase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('인증 정보가 없으면 저장소를 보지 않고 401 auth.unauthenticated이다', async () => {
    const { useCase, sessions, apiTokens } = build();

    await expect(useCase.execute({ credential: null })).rejects.toMatchObject({
      kind: 'unauthenticated',
      code: 'auth.unauthenticated',
    });
    expect(sessions.isActive).not.toHaveBeenCalled();
    expect(apiTokens.find).not.toHaveBeenCalled();
  });

  it('유효한 세션이면 모든 권한을 가진다', async () => {
    const { useCase, sessions } = build({ sessionActive: true });

    await expect(useCase.execute({ credential: SESSION })).resolves.toEqual({
      permissions: ['sources:sync', 'sources:read', 'posts:publish', 'api_tokens:manage'],
    });
    expect(sessions.isActive).toHaveBeenCalledWith('session-token');
  });

  it('만료된 세션이면 401 auth.unauthenticated이다', async () => {
    const { useCase } = build({ sessionActive: false });

    await expect(useCase.execute({ credential: SESSION })).rejects.toMatchObject({
      kind: 'unauthenticated',
      code: 'auth.unauthenticated',
    });
  });

  it('원문의 hash로 찾은 토큰이면 그 토큰의 권한을 가진다', async () => {
    const { useCase, apiTokens } = build({ token: storedToken() });

    await expect(useCase.execute({ credential: BEARER })).resolves.toEqual({
      permissions: ['sources:sync'],
    });
    expect(apiTokens.find).toHaveBeenCalledWith({
      secretHash: sha256Hex('shk_secret'),
    });
  });

  it('맞는 토큰이 없으면 401 auth.unauthenticated이다', async () => {
    const { useCase } = build({ token: null });

    await expect(useCase.execute({ credential: BEARER })).rejects.toMatchObject({ code: 'auth.unauthenticated' });
  });

  it('토큰으로 인증하면 사용 시각을 저장한다', async () => {
    const { useCase, apiTokens } = build({ token: storedToken() });

    await useCase.execute({ credential: BEARER });

    expect(apiTokens.update.mock.calls[0][0].getProps().lastUsedAt).toEqual(NOW);
  });

  it('1분 안에 다시 인증하면 사용 시각을 저장하지 않는다', async () => {
    const { useCase, apiTokens } = build({
      token: storedToken(new Date(NOW.getTime() - 30 * 1000)),
    });

    await useCase.execute({ credential: BEARER });

    expect(apiTokens.update).not.toHaveBeenCalled();
  });
});
