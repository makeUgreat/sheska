import { describe, expect, it } from 'vitest';
import {
  ApiToken,
  ApiTokenName,
  ApiTokenPermissions,
  ApiTokenSecret,
} from '@contexts/iam/domain';
import { ApiTokenPgDrizzleMapper } from '../api-token.pg-drizzle.mapper';

describe('ApiTokenPgDrizzleMapper', () => {
  it('api token row를 ApiToken aggregate로 복원한다', () => {
    const row = {
      id: 'token-1',
      name: 'macbook',
      secretHash: 'hash',
      hint: 'shk_Ab3d',
      permissions: ['sources:sync' as const, 'posts:publish' as const],
      lastUsedAt: new Date('2026-11-19T01:00:00.000Z'),
      createdAt: new Date('2026-11-19T00:00:00.000Z'),
    };

    const apiToken = ApiTokenPgDrizzleMapper.toDomain(row);

    expect(ApiTokenPgDrizzleMapper.toInsert(apiToken)).toEqual(row);
  });

  it('ApiToken aggregate를 insert row로 변환한다', () => {
    const secret = ApiTokenSecret.of('shk_Ab3dXYZ');
    const apiToken = ApiToken.create({
      name: ApiTokenName.of('macbook'),
      secret,
      permissions: ApiTokenPermissions.of(['sources:sync']),
    });

    expect(ApiTokenPgDrizzleMapper.toInsert(apiToken)).toEqual({
      id: apiToken.id,
      name: 'macbook',
      secretHash: secret.hash(),
      hint: 'shk_Ab3d',
      permissions: ['sources:sync'],
      lastUsedAt: null,
      createdAt: apiToken.createdAt,
    });
  });
});
