import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { type ApiTokenQuery } from '@contexts/iam/application/ports';
import {
  ApiToken,
  ApiTokenName,
  type ApiTokenRepository,
  ApiTokenSecret,
} from '@contexts/iam/domain';
import {
  API_TOKEN_QUERY,
  API_TOKEN_REPOSITORY,
} from '@contexts/iam/iam.di-tokens';
import { AppModule } from '@platform/nest/app.module';

function buildApiToken(name: string) {
  const secret = ApiTokenSecret.generate();
  return {
    apiToken: ApiToken.create({ name: ApiTokenName.of(name), secret }),
    secret,
  };
}

describe('ApiTokenPgDrizzleRepository', () => {
  let app: INestApplication;
  let apiTokens: ApiTokenRepository;
  let apiTokenQuery: ApiTokenQuery;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    apiTokens = app.get<ApiTokenRepository>(API_TOKEN_REPOSITORY);
    apiTokenQuery = app.get<ApiTokenQuery>(API_TOKEN_QUERY);
  });

  afterAll(async () => {
    await app.close();
  });

  it('저장한 토큰을 원문의 hash로 찾는다', async () => {
    const { apiToken, secret } = buildApiToken('repo-find');
    await apiTokens.insert(apiToken);

    const found = await apiTokens.find({ secretHash: secret.hash() });

    expect(found?.id).toBe(apiToken.id);
    expect(found?.getProps().name.unpack()).toBe('repo-find');
  });

  it('맞는 hash가 없으면 null을 준다', async () => {
    await expect(
      apiTokens.find({ secretHash: ApiTokenSecret.generate().hash() }),
    ).resolves.toBeNull();
  });

  it('같은 이름으로 두 번 저장하면 name_taken 오류를 던진다', async () => {
    await apiTokens.insert(buildApiToken('repo-taken').apiToken);

    await expect(
      apiTokens.insert(buildApiToken('repo-taken').apiToken),
    ).rejects.toMatchObject({
      kind: 'constraint_violation',
      code: 'api_token.name_taken',
    });
  });

  it('지운 토큰의 이름은 다시 쓸 수 있다', async () => {
    const { apiToken } = buildApiToken('repo-reuse');
    await apiTokens.insert(apiToken);
    await apiTokens.delete(apiToken);

    await expect(
      apiTokens.insert(buildApiToken('repo-reuse').apiToken),
    ).resolves.toBeDefined();
  });

  it('지운 토큰은 찾을 수 없다', async () => {
    const { apiToken, secret } = buildApiToken('repo-delete');
    await apiTokens.insert(apiToken);

    await apiTokens.delete(apiToken);

    await expect(
      apiTokens.find({ secretHash: secret.hash() }),
    ).resolves.toBeNull();
    await expect(apiTokens.get({ id: apiToken.id })).rejects.toMatchObject({
      kind: 'not_found',
      code: 'api_token.not_found',
    });
  });

  it('사용 시각을 저장한다', async () => {
    const { apiToken } = buildApiToken('repo-update');
    await apiTokens.insert(apiToken);
    const at = new Date('2026-11-19T12:00:00.000Z');

    apiToken.tryRecordUse(at);
    await apiTokens.update(apiToken);

    const stored = await apiTokens.get({ id: apiToken.id });
    expect(stored.getProps().lastUsedAt).toEqual(at);
  });

  it('이미 지운 토큰을 update하면 not_found 오류를 던진다', async () => {
    const { apiToken } = buildApiToken('repo-update-deleted');
    await apiTokens.insert(apiToken);
    await apiTokens.delete(apiToken);

    apiToken.tryRecordUse(new Date());
    await expect(apiTokens.update(apiToken)).rejects.toMatchObject({
      kind: 'not_found',
      code: 'api_token.not_found',
    });
  });

  it('이미 지운 토큰을 다시 지우면 not_found 오류를 던진다', async () => {
    const { apiToken } = buildApiToken('repo-delete-twice');
    await apiTokens.insert(apiToken);
    await apiTokens.delete(apiToken);

    await expect(apiTokens.delete(apiToken)).rejects.toMatchObject({
      kind: 'not_found',
      code: 'api_token.not_found',
    });
  });

  describe('ApiTokenPgDrizzleQuery', () => {
    it('토큰을 만든 순서로 주고 원문이나 hash는 주지 않는다', async () => {
      const first = buildApiToken('query-first');
      await apiTokens.insert(first.apiToken);
      const second = buildApiToken('query-second');
      await apiTokens.insert(second.apiToken);

      const items = await apiTokenQuery.list();
      const ours = items.filter((item) =>
        ['query-first', 'query-second'].includes(item.name),
      );

      expect(ours).toEqual([
        {
          apiTokenId: first.apiToken.id,
          name: 'query-first',
          hint: first.secret.hint(),
          createdAt: first.apiToken.createdAt,
          lastUsedAt: null,
        },
        {
          apiTokenId: second.apiToken.id,
          name: 'query-second',
          hint: second.secret.hint(),
          createdAt: second.apiToken.createdAt,
          lastUsedAt: null,
        },
      ]);
    });
  });
});
