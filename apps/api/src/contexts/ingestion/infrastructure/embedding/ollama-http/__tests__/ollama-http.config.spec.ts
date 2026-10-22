import { afterEach, describe, expect, it, vi } from 'vitest';
import { ollamaConfig } from '../ollama-http.config';

describe('ollamaConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('EMBEDDING_BASE_URL이 유효하면 임베딩 서버 설정을 돌려준다', () => {
    vi.stubEnv('EMBEDDING_BASE_URL', 'http://localhost:11434');

    expect(ollamaConfig()).toEqual({ baseUrl: 'http://localhost:11434' });
  });

  it.each([undefined, '', 'not-a-url'])(
    'EMBEDDING_BASE_URL이 %j이면 거부한다',
    (value) => {
      vi.stubEnv('EMBEDDING_BASE_URL', value);

      expect(() => ollamaConfig()).toThrow('EMBEDDING_BASE_URL');
    },
  );
});
