import { describe, beforeAll, it, expect } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { InfrastructureException } from '@kernels/infrastructure';
import { OllamaHttpEmbedder } from '@contexts/ingestion/infrastructure/embedding/ollama-http/ollama-http.embedder';

const OLLAMA_TEST_BASE_URL = 'http://127.0.0.1:11435';
const OLLAMA_TEST_MODEL = 'qwen3-embedding:0.6b'; // OllamaHttpEmbedder에 하드코딩된 모델과 일치해야 함
const OLLAMA_UNREACHABLE_URL = 'http://127.0.0.1:19999';

describe('OllamaHttpEmbedder (integration)', () => {
  let embedder: OllamaHttpEmbedder;

  beforeAll(() => {
    const configService = {
      get: (key: string) => {
        if (key === 'EMBEDDING_BASE_URL') return OLLAMA_TEST_BASE_URL;
      },
    } as unknown as ConfigService;

    embedder = new OllamaHttpEmbedder(configService);
  });

  it('텍스트를 임베딩하면 1024차원 벡터와 모델명을 반환한다', async () => {
    const result = await embedder.embed('Hello World');

    expect(result.model).toBe(OLLAMA_TEST_MODEL);
    expect(result.embedding).toHaveLength(1024);
    expect(result.embedding.every((v) => typeof v === 'number')).toBe(true);
  });

  it('동일 텍스트는 동일한 임베딩을 반환한다', async () => {
    const [r1, r2] = await Promise.all([
      embedder.embed('deterministic test'),
      embedder.embed('deterministic test'),
    ]);

    expect(r1.embedding).toEqual(r2.embedding);
  });

  it('다른 텍스트는 다른 임베딩을 반환한다', async () => {
    const [r1, r2] = await Promise.all([
      embedder.embed('apple'),
      embedder.embed('refrigerator'),
    ]);

    expect(r1.embedding).not.toEqual(r2.embedding);
  });
});

describe('OllamaHttpEmbedder — 서비스 불가 (integration)', () => {
  let unreachableEmbedder: OllamaHttpEmbedder;

  beforeAll(() => {
    const configService = {
      get: (key: string) => {
        if (key === 'EMBEDDING_BASE_URL') return OLLAMA_UNREACHABLE_URL;
      },
    } as unknown as ConfigService;

    unreachableEmbedder = new OllamaHttpEmbedder(configService);
  });

  it('Ollama에 연결할 수 없으면 cause가 직렬화된 InfrastructureException을 던진다', async () => {
    await expect(unreachableEmbedder.embed('hello')).rejects.toThrow(
      InfrastructureException,
    );
    await expect(unreachableEmbedder.embed('hello')).rejects.toMatchObject({
      kind: 'unavailable',
      code: 'ollama.request_failed',
      cause: expect.objectContaining({
        name: expect.any(String) as string,
        message: expect.any(String) as string,
      }) as unknown,
    });
  });
});
