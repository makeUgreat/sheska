import { Redis } from 'ioredis';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { UnavailableError } from '@core/errors';
import { sha256Hex } from '@core/hash';
import { SessionRedisStore } from '@contexts/iam/infrastructure/session/redis/session.redis.store';

const REDIS_URL = 'redis://127.0.0.1:56379';

describe('SessionRedisStore', () => {
  let redis: Redis;
  let store: SessionRedisStore;

  beforeAll(() => {
    redis = new Redis(REDIS_URL);
    store = new SessionRedisStore(redis);
  });

  beforeEach(async () => {
    await redis.flushdb();
  });

  afterAll(async () => {
    await redis.quit();
  });

  it('발급한 세션은 유효하다', async () => {
    const session = await store.issue(60);

    await expect(store.isActive(session.token)).resolves.toBe(true);
  });

  it('발급한 적 없는 토큰은 유효하지 않다', async () => {
    await expect(store.isActive('unknown-token')).resolves.toBe(false);
  });

  it('지운 세션은 유효하지 않다', async () => {
    const session = await store.issue(60);

    await store.revoke(session.token);

    await expect(store.isActive(session.token)).resolves.toBe(false);
  });

  it('수명이 지나면 세션이 사라진다', async () => {
    const session = await store.issue(1);

    await new Promise((resolve) => setTimeout(resolve, 1_100));

    await expect(store.isActive(session.token)).resolves.toBe(false);
  });

  it('Redis에 닿지 못하면 UnavailableError로 바꾼다', async () => {
    const unreachable = new Redis('redis://127.0.0.1:1', {
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    const result = new SessionRedisStore(unreachable).isActive('token');

    await expect(result).rejects.toBeInstanceOf(UnavailableError);
    await expect(result).rejects.toMatchObject({ code: 'redis.unavailable' });
    unreachable.disconnect();
  });

  it('토큰 원문을 key에 남기지 않는다', async () => {
    const session = await store.issue(60);

    const keys = await redis.keys('*');

    expect(keys).toEqual([`iam:session:${sha256Hex(session.token)}`]);
  });
});
