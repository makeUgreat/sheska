import { Redis } from 'ioredis';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { UnavailableError, UnexpectedError } from '@core/errors';
import { LoginAttemptPolicy } from '@contexts/iam/domain';
import { LoginAttemptRedisCounter } from '@contexts/iam/infrastructure/login-attempt/redis/login-attempt.redis.counter';

const REDIS_URL = 'redis://127.0.0.1:56379';
const ADDRESS = '203.0.113.7';
const POLICY = new LoginAttemptPolicy({
  maxFailures: 3,
  windowSeconds: 60,
  lockSeconds: 600,
});

describe('LoginAttemptRedisCounter', () => {
  let redis: Redis;
  let counter: LoginAttemptRedisCounter;

  beforeAll(() => {
    redis = new Redis(REDIS_URL);
    counter = new LoginAttemptRedisCounter(redis);
  });

  beforeEach(async () => {
    await redis.flushdb();
  });

  afterAll(async () => {
    await redis.quit();
  });

  async function registerTimes(times: number) {
    let attempt = await counter.register(ADDRESS, POLICY);
    for (let i = 1; i < times; i++) {
      attempt = await counter.register(ADDRESS, POLICY);
    }
    return attempt;
  }

  it('첫 시도는 1번째 시도다', async () => {
    await expect(counter.register(ADDRESS, POLICY)).resolves.toMatchObject({
      attemptNumber: 1,
    });
  });

  it('시도를 IP별로 센다', async () => {
    await registerTimes(2);

    await expect(counter.register('198.51.100.1', POLICY)).resolves.toMatchObject({ attemptNumber: 1 });
    await expect(counter.register(ADDRESS, POLICY)).resolves.toMatchObject({
      attemptNumber: 3,
    });
  });

  it('첫 시도부터 집계 창 시간 안에서만 센다', async () => {
    const attempt = await counter.register(ADDRESS, POLICY);

    expect(attempt.retryAfterSeconds).toBeGreaterThan(0);
    expect(attempt.retryAfterSeconds).toBeLessThanOrEqual(POLICY.windowSeconds);
  });

  it('한도에 닿은 시도부터 잠금 시간만큼 기록을 유지한다', async () => {
    const attempt = await registerTimes(POLICY.maxFailures);

    expect(attempt.retryAfterSeconds).toBeGreaterThan(POLICY.windowSeconds);
    expect(attempt.retryAfterSeconds).toBeLessThanOrEqual(POLICY.lockSeconds);
  });

  it('잠긴 뒤에 시도해도 잠금 시간이 늘어나지 않는다', async () => {
    await registerTimes(POLICY.maxFailures);
    await redis.expire(`iam:login-attempts:${ADDRESS}`, 100);

    const attempt = await counter.register(ADDRESS, POLICY);

    expect(attempt.retryAfterSeconds).toBeLessThanOrEqual(100);
  });

  it('동시에 시도해도 시도마다 서로 다른 횟수를 받는다', async () => {
    const attempts = await Promise.all(Array.from({ length: 20 }, () => counter.register(ADDRESS, POLICY)));

    expect(attempts.map((attempt) => attempt.attemptNumber).sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it('Redis가 명령을 거부하면 UnexpectedError로 바꾼다', async () => {
    await redis.hset(`iam:login-attempts:${ADDRESS}`, 'field', 'value');

    const result = counter.register(ADDRESS, POLICY);

    await expect(result).rejects.toBeInstanceOf(UnexpectedError);
    await expect(result).rejects.toMatchObject({
      code: 'redis.command_rejected',
    });
  });

  it('Redis에 닿지 못하면 UnavailableError로 바꾼다', async () => {
    const unreachable = buildUnreachableRedis();

    const result = new LoginAttemptRedisCounter(unreachable).register(ADDRESS, POLICY);

    await expect(result).rejects.toBeInstanceOf(UnavailableError);
    await expect(result).rejects.toMatchObject({ code: 'redis.unavailable' });
    unreachable.disconnect();
  });

  it('지우면 그 IP의 횟수가 처음부터 다시 시작한다', async () => {
    await registerTimes(2);

    await counter.clear(ADDRESS);

    await expect(counter.register(ADDRESS, POLICY)).resolves.toMatchObject({
      attemptNumber: 1,
    });
  });
});

function buildUnreachableRedis(): Redis {
  return new Redis('redis://127.0.0.1:1', {
    lazyConnect: true,
    enableOfflineQueue: false,
  });
}
