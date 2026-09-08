import { describe, expect, it } from 'vitest';
import { parseRetryAfterMs } from '../retry-after';

describe('parseRetryAfterMs', () => {
  it('delta-seconds 형식을 밀리초로 변환한다', () => {
    expect(parseRetryAfterMs('120')).toBe(120_000);
  });

  it('HTTP-date 형식을 주입된 now 기준 남은 밀리초로 변환한다', () => {
    const now = () => Date.parse('2026-01-01T00:00:00Z');

    expect(parseRetryAfterMs('2026-01-01T00:00:05Z', now)).toBe(5_000);
  });

  it('값이 없으면 undefined를 반환한다', () => {
    expect(parseRetryAfterMs(null)).toBeUndefined();
    expect(parseRetryAfterMs(undefined)).toBeUndefined();
    expect(parseRetryAfterMs('')).toBeUndefined();
  });

  it('파싱할 수 없는 값이면 undefined를 반환한다', () => {
    expect(parseRetryAfterMs('not-a-valid-value')).toBeUndefined();
  });

  it('과거 시각을 가리키는 HTTP-date면 0으로 clamp한다', () => {
    const now = () => Date.parse('2026-01-01T00:00:10Z');

    expect(parseRetryAfterMs('2026-01-01T00:00:00Z', now)).toBe(0);
  });
});
