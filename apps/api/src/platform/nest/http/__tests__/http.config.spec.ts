import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { httpConfig } from '../http.config';

describe('httpConfig', () => {
  beforeEach(() => {
    vi.stubEnv('PORT', undefined);
    vi.stubEnv('CORS_ORIGINS', 'http://localhost:5173');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('CORS_ORIGINS를 쉼표로 나눈 출처 목록으로 돌려준다', () => {
    vi.stubEnv('CORS_ORIGINS', 'app://obsidian.md, https://hash.example.com');

    expect(httpConfig().corsOrigins).toEqual([
      'app://obsidian.md',
      'https://hash.example.com',
    ]);
  });

  it('PORT가 없으면 3000을 쓴다', () => {
    expect(httpConfig().port).toBe(3000);
  });

  it('PORT를 숫자로 바꾼다', () => {
    vi.stubEnv('PORT', '8080');

    expect(httpConfig().port).toBe(8080);
  });

  it.each(['0', '65536', 'http'])('PORT가 %j이면 거부한다', (value) => {
    vi.stubEnv('PORT', value);

    expect(() => httpConfig()).toThrow('PORT');
  });

  it.each([undefined, '', 'http://localhost:5173,*'])(
    'CORS_ORIGINS가 %j이면 거부한다',
    (value) => {
      vi.stubEnv('CORS_ORIGINS', value);

      expect(() => httpConfig()).toThrow('CORS_ORIGINS');
    },
  );
});
