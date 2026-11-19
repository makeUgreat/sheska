import { sha256Hex } from '@core/hash';
import { describe, expect, it } from 'vitest';
import { ApiToken } from '../api-token.aggregate';
import { ApiTokenName } from '../api-token-name.vo';
import { ApiTokenPermissions } from '../api-token-permissions.vo';
import { ApiTokenSecret } from '../api-token-secret.vo';

const CREATED_AT = new Date('2026-11-19T00:00:00.000Z');

function restore(lastUsedAt: Date | null = null) {
  return ApiToken.restore({
    id: 'token-1',
    name: 'macbook',
    secretHash: sha256Hex('shk_secret'),
    hint: 'shk_secr',
    permissions: ['sources:sync'],
    lastUsedAt,
    createdAt: CREATED_AT,
  });
}

function secondsAfter(base: Date, seconds: number) {
  return new Date(base.getTime() + seconds * 1000);
}

describe('ApiToken', () => {
  it('원문 대신 hash와 hint를 저장한다', () => {
    const secret = ApiTokenSecret.of('shk_Ab3dXYZ');

    const props = ApiToken.create({
      name: ApiTokenName.of('macbook'),
      secret,
      permissions: ApiTokenPermissions.of(['sources:sync']),
    }).getProps();

    expect(props.secretHash).toBe(sha256Hex('shk_Ab3dXYZ'));
    expect(props.hint).toBe('shk_Ab3d');
    expect(Object.values(props)).not.toContain('shk_Ab3dXYZ');
  });

  it('고른 권한을 가진다', () => {
    const apiToken = ApiToken.create({
      name: ApiTokenName.of('macbook'),
      secret: ApiTokenSecret.generate(),
      permissions: ApiTokenPermissions.of(['sources:sync', 'sources:read']),
    });

    expect(apiToken.getProps().permissions.unpack()).toEqual(['sources:sync', 'sources:read']);
  });

  it('쓴 적이 없는 상태로 시작한다', () => {
    const props = ApiToken.create({
      name: ApiTokenName.of('macbook'),
      secret: ApiTokenSecret.generate(),
      permissions: ApiTokenPermissions.of(['sources:sync']),
    }).getProps();

    expect(props.lastUsedAt).toBeNull();
  });

  it('처음 쓰면 사용 시각을 남긴다', () => {
    const token = restore();
    const at = secondsAfter(CREATED_AT, 10);

    expect(token.tryRecordUse(at)).toBe(true);
    expect(token.getProps().lastUsedAt).toEqual(at);
  });

  it('마지막 사용에서 1분이 안 지났으면 사용 시각을 바꾸지 않는다', () => {
    const last = secondsAfter(CREATED_AT, 10);
    const token = restore(last);

    expect(token.tryRecordUse(secondsAfter(last, 59))).toBe(false);
    expect(token.getProps().lastUsedAt).toEqual(last);
  });

  it('마지막 사용에서 1분이 지났으면 사용 시각을 바꾼다', () => {
    const last = secondsAfter(CREATED_AT, 10);
    const token = restore(last);
    const at = secondsAfter(last, 60);

    expect(token.tryRecordUse(at)).toBe(true);
    expect(token.getProps().lastUsedAt).toEqual(at);
  });

  it('가진 권한을 알려 준다', () => {
    expect(restore().grantedPermissions()).toEqual(['sources:sync']);
  });
});
