import { describe, expect, it } from 'vitest';
import { parseOllamaConfig } from '../ollama.config';

describe('parseOllamaConfig', () => {
  const validEnv = {
    OLLAMA_BASE_URL: 'http://localhost:11434',
    OLLAMA_MODEL: 'qwen3-embedding:0.6b',
  };

  it('OLLAMA 설정이 유효하면 typed config를 반환한다', () => {
    expect(parseOllamaConfig(validEnv)).toEqual({
      baseUrl: 'http://localhost:11434',
      model: 'qwen3-embedding:0.6b',
    });
  });

  it('OLLAMA_BASE_URL이 없으면 validation에 실패한다', () => {
    expect(() =>
      parseOllamaConfig({ OLLAMA_MODEL: validEnv.OLLAMA_MODEL }),
    ).toThrow();
  });

  it('OLLAMA_BASE_URL이 URL 형식이 아니면 validation에 실패한다', () => {
    expect(() =>
      parseOllamaConfig({
        ...validEnv,
        OLLAMA_BASE_URL: 'not-a-url',
      }),
    ).toThrow();
  });

  it('OLLAMA_MODEL이 빈 문자열이면 validation에 실패한다', () => {
    expect(() =>
      parseOllamaConfig({
        ...validEnv,
        OLLAMA_MODEL: '',
      }),
    ).toThrow();
  });
});
