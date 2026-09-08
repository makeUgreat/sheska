import { describe, beforeAll, it, expect } from 'vitest';
import { computeDeadline } from '@core/deadline';
import { type CallContext } from '@core/call-context';
import { InfrastructureException } from '@kernels/infrastructure';
import { OllamaHttpEmbedder } from '@contexts/ingestion/infrastructure/embedding/ollama-http/ollama-http.embedder';

const OLLAMA_TEST_BASE_URL = 'http://127.0.0.1:11435';
const OLLAMA_TEST_MODEL = 'qwen3-embedding:0.6b'; // 클래스 내부 OLLAMA_MODEL 상수와 일치해야 함 — global-setup.ts가 pull하는 모델
const OLLAMA_UNREACHABLE_URL = 'http://127.0.0.1:19999';

function buildContext(remainingMs = 60_000): CallContext {
  return { deadline: computeDeadline(remainingMs), attemptTimeoutMs: 30_000 };
}

describe('OllamaHttpEmbedder (integration)', () => {
  let embedder: OllamaHttpEmbedder;

  beforeAll(() => {
    embedder = new OllamaHttpEmbedder({ baseUrl: OLLAMA_TEST_BASE_URL });
  });

  it('텍스트를 임베딩하면 1024차원 벡터와 모델명을 반환한다', async () => {
    const result = await embedder.embed('Hello World', buildContext());

    expect(result.model).toBe(OLLAMA_TEST_MODEL);
    expect(result.embedding).toHaveLength(1024);
    expect(result.embedding.every((v) => typeof v === 'number')).toBe(true);
  });

  it('동일 텍스트는 동일한 임베딩을 반환한다', async () => {
    const [r1, r2] = await Promise.all([
      embedder.embed('deterministic test', buildContext()),
      embedder.embed('deterministic test', buildContext()),
    ]);

    expect(r1.embedding).toEqual(r2.embedding);
  });

  it('다른 텍스트는 다른 임베딩을 반환한다', async () => {
    const [r1, r2] = await Promise.all([
      embedder.embed('apple', buildContext()),
      embedder.embed('refrigerator', buildContext()),
    ]);

    expect(r1.embedding).not.toEqual(r2.embedding);
  });
});

describe('OllamaHttpEmbedder — 서비스 불가 (integration)', () => {
  let unreachableEmbedder: OllamaHttpEmbedder;

  beforeAll(() => {
    unreachableEmbedder = new OllamaHttpEmbedder({
      baseUrl: OLLAMA_UNREACHABLE_URL,
    });
  });

  it('Ollama에 연결할 수 없으면 재시도가 소진된 뒤 cause가 직렬화된 InfrastructureException을 던진다', async () => {
    await expect(
      unreachableEmbedder.embed('hello', buildContext()),
    ).rejects.toThrow(InfrastructureException);
    await expect(
      unreachableEmbedder.embed('hello', buildContext()),
    ).rejects.toMatchObject({
      kind: 'unavailable',
      code: 'ollama.request_failed',
      cause: expect.objectContaining({
        name: expect.any(String) as string,
        message: expect.any(String) as string,
      }) as unknown,
    });
  });
});
