import { afterEach, describe, expect, it, vi } from 'vitest';
import { queueConfig } from '../queue.config';

describe('queueConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('REDIS_URL이 유효하면 큐 설정을 돌려준다', () => {
    vi.stubEnv('REDIS_URL', 'redis://localhost:6379');

    expect(queueConfig()).toEqual({ redisUrl: 'redis://localhost:6379' });
  });

  it.each([undefined, '', 'not-a-url'])(
    'REDIS_URL이 %j이면 거부한다',
    (value) => {
      vi.stubEnv('REDIS_URL', value);

      expect(() => queueConfig()).toThrow('REDIS_URL');
    },
  );
});
