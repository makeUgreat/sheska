import { afterEach, describe, expect, it, vi } from 'vitest';
import { redisConfig } from '../redis.config';

describe('redisConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('REDIS_URL이 유효하면 Redis 설정을 돌려준다', () => {
    vi.stubEnv('REDIS_URL', 'redis://localhost:6379');

    expect(redisConfig()).toEqual({ redisUrl: 'redis://localhost:6379' });
  });

  it.each([undefined, '', 'not-a-url'])(
    'REDIS_URL이 %j이면 거부한다',
    (value) => {
      vi.stubEnv('REDIS_URL', value);

      expect(() => redisConfig()).toThrow('REDIS_URL');
    },
  );
});
