import { describe, expect, it } from 'vitest';
import { parseOllamaConfig } from '../ollama.config';

describe('parseOllamaConfig', () => {
  const validEnv = {
    EMBEDDING_BASE_URL: 'http://localhost:11434',
  };

  it('OLLAMA 설정이 유효하면 typed config를 반환한다', () => {
    expect(parseOllamaConfig(validEnv)).toEqual({
      baseUrl: 'http://localhost:11434',
    });
  });

  it('EMBEDDING_BASE_URL이 없으면 validation에 실패한다', () => {
    expect(() => parseOllamaConfig({})).toThrow();
  });

  it('EMBEDDING_BASE_URL이 URL 형식이 아니면 validation에 실패한다', () => {
    expect(() =>
      parseOllamaConfig({
        EMBEDDING_BASE_URL: 'not-a-url',
      }),
    ).toThrow();
  });
});
