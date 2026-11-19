import { NotFoundError } from '@core/errors';
import { sha256Hex } from '@core/hash';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ApiTokenQuery } from '@contexts/iam/application/ports';
import { ApiToken, type ApiTokenRepository } from '@contexts/iam/domain';
import { AuthenticateApiTokenUseCase } from '../authenticate-api-token.use-case';
import { IssueApiTokenUseCase } from '../issue-api-token.use-case';
import { ListApiTokensUseCase } from '../list-api-tokens.use-case';
import { RevokeApiTokenUseCase } from '../revoke-api-token.use-case';

const NOW = new Date('2026-11-19T12:00:00.000Z');

function storedToken(lastUsedAt: Date | null = null) {
  return ApiToken.restore({
    id: 'token-1',
    name: 'macbook',
    secretHash: sha256Hex('shk_secret'),
    hint: 'shk_secr',
    lastUsedAt,
    createdAt: new Date('2026-11-01T00:00:00.000Z'),
  });
}

function buildApiTokens(found: ApiToken | null = null) {
  return {
    find: vi.fn().mockResolvedValue(found),
    get: vi.fn().mockResolvedValue(found),
    insert: vi.fn((apiToken: ApiToken) => Promise.resolve(apiToken)),
    update: vi.fn((apiToken: ApiToken) => Promise.resolve(apiToken)),
    delete: vi.fn().mockResolvedValue(undefined),
  } satisfies ApiTokenRepository;
}

describe('IssueApiTokenUseCase', () => {
  it('원문은 응답에만 주고 저장소에는 hash를 넘긴다', async () => {
    const apiTokens = buildApiTokens();

    const result = await new IssueApiTokenUseCase(apiTokens).execute({
      name: 'macbook',
    });

    expect(result).toMatchObject({
      name: 'macbook',
      hint: result.token.slice(0, 8),
      lastUsedAt: null,
    });
    expect(result.token).toMatch(/^shk_/);
    const saved = apiTokens.insert.mock.calls[0][0].getProps();
    expect(saved.secretHash).toBe(sha256Hex(result.token));
    expect(Object.values(saved)).not.toContain(result.token);
  });

  it('저장소가 이름 중복으로 거절하면 그 오류를 그대로 던진다', async () => {
    const apiTokens = buildApiTokens();
    const taken = new Error('api_token.name_taken');
    apiTokens.insert.mockRejectedValue(taken);

    await expect(
      new IssueApiTokenUseCase(apiTokens).execute({ name: 'macbook' }),
    ).rejects.toBe(taken);
  });
});

describe('ListApiTokensUseCase', () => {
  it('query가 준 목록을 그대로 준다', async () => {
    const items = [
      {
        apiTokenId: 'token-1',
        name: 'macbook',
        hint: 'shk_secr',
        createdAt: NOW,
        lastUsedAt: null,
      },
    ];
    const query = {
      list: vi.fn().mockResolvedValue(items),
    } satisfies ApiTokenQuery;

    await expect(new ListApiTokensUseCase(query).execute()).resolves.toBe(
      items,
    );
  });
});

describe('RevokeApiTokenUseCase', () => {
  it('식별자로 찾은 토큰을 지운다', async () => {
    const token = storedToken();
    const apiTokens = buildApiTokens(token);

    await new RevokeApiTokenUseCase(apiTokens).execute({
      apiTokenId: 'token-1',
    });

    expect(apiTokens.get).toHaveBeenCalledWith({ id: 'token-1' });
    expect(apiTokens.delete).toHaveBeenCalledWith(token);
  });

  it('토큰이 없으면 지우지 않고 not found 오류를 던진다', async () => {
    const apiTokens = buildApiTokens();
    apiTokens.get.mockRejectedValue(
      new NotFoundError({
        code: 'api_token.not_found',
        message: 'API token not found',
        details: {},
      }),
    );

    await expect(
      new RevokeApiTokenUseCase(apiTokens).execute({ apiTokenId: 'missing' }),
    ).rejects.toMatchObject({ code: 'api_token.not_found' });
    expect(apiTokens.delete).not.toHaveBeenCalled();
  });
});

describe('AuthenticateApiTokenUseCase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('원문의 hash로 토큰을 찾는다', async () => {
    const apiTokens = buildApiTokens(storedToken());

    await new AuthenticateApiTokenUseCase(apiTokens).execute({
      token: 'shk_secret',
    });

    expect(apiTokens.find).toHaveBeenCalledWith({
      secretHash: sha256Hex('shk_secret'),
    });
  });

  it('맞는 토큰이 없으면 인증하지 않는다', async () => {
    const apiTokens = buildApiTokens(null);

    await expect(
      new AuthenticateApiTokenUseCase(apiTokens).execute({ token: 'wrong' }),
    ).resolves.toEqual({ authenticated: false });
    expect(apiTokens.update).not.toHaveBeenCalled();
  });

  it('인증하면 사용 시각을 저장한다', async () => {
    const apiTokens = buildApiTokens(storedToken());

    await expect(
      new AuthenticateApiTokenUseCase(apiTokens).execute({
        token: 'shk_secret',
      }),
    ).resolves.toEqual({ authenticated: true });
    expect(apiTokens.update.mock.calls[0][0].getProps().lastUsedAt).toEqual(
      NOW,
    );
  });

  it('1분 안에 다시 인증하면 사용 시각을 저장하지 않는다', async () => {
    const apiTokens = buildApiTokens(
      storedToken(new Date(NOW.getTime() - 30 * 1000)),
    );

    await expect(
      new AuthenticateApiTokenUseCase(apiTokens).execute({
        token: 'shk_secret',
      }),
    ).resolves.toEqual({ authenticated: true });
    expect(apiTokens.update).not.toHaveBeenCalled();
  });
});
