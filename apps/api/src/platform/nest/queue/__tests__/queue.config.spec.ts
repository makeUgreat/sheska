import { describe, expect, it } from 'vitest';
import { parseQueueConfig } from '../queue.config';

describe('queue config', () => {
  it('REDIS_URL이 유효하면 typed config를 반환한다', () => {
    const validRedisUrl = 'redis://127.0.0.1:6379';

    const config = parseQueueConfig({
      REDIS_URL: validRedisUrl,
    });

    expect(config).toEqual({
      redisUrl: validRedisUrl,
    });
  });

  it('REDIS_URL이 없으면 validation에 실패한다', () => {
    expect(() => parseQueueConfig({})).toThrow();
  });

  it('REDIS_URL이 빈 문자열이면 validation에 실패한다', () => {
    expect(() =>
      parseQueueConfig({
        REDIS_URL: '',
      }),
    ).toThrow();
  });

  it('REDIS_URL이 URL 형식이 아니면 validation에 실패한다', () => {
    expect(() =>
      parseQueueConfig({
        REDIS_URL: 'not-a-url',
      }),
    ).toThrow();
  });
});
