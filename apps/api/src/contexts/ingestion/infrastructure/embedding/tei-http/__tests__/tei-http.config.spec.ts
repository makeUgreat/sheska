import { describe, expect, it } from 'vitest';
import { parseTeiConfig } from '../tei-http.config';

describe('parseTeiConfig', () => {
  const validEnv = {
    EMBEDDING_BASE_URL: 'http://localhost:3000',
  };

  it('TEI 설정이 유효하면 typed config를 반환한다', () => {
    expect(parseTeiConfig(validEnv)).toEqual({
      baseUrl: 'http://localhost:3000',
    });
  });

  it('EMBEDDING_BASE_URL이 없으면 validation에 실패한다', () => {
    expect(() => parseTeiConfig({})).toThrow();
  });

  it('EMBEDDING_BASE_URL이 URL 형식이 아니면 validation에 실패한다', () => {
    expect(() =>
      parseTeiConfig({
        EMBEDDING_BASE_URL: 'not-a-url',
      }),
    ).toThrow();
  });
});
