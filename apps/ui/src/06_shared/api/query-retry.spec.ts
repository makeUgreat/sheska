import { describe, expect, it } from 'vitest';
import { HttpError } from './http';
import { shouldRetryQuery } from './query-retry';

describe('shouldRetryQuery', () => {
  it('재시도 가능한 실패는 두 번까지만 재시도한다', () => {
    const error = new HttpError(503, 'Service Unavailable');

    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(1, error)).toBe(true);
    expect(shouldRetryQuery(2, error)).toBe(false);
  });

  it('재시도해도 결과가 달라지지 않는 실패는 재시도하지 않는다', () => {
    expect(shouldRetryQuery(0, new HttpError(404, 'Not Found'))).toBe(false);
  });

  it('status를 알 수 없는 실패는 재시도한다', () => {
    expect(shouldRetryQuery(0, new TypeError('Failed to fetch'))).toBe(true);
  });
});
