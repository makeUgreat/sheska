import { describe, expect, it, vi, type Mock } from 'vitest';
import { type Embedder } from '@contexts/ingestion/ingestion.di-tokens';
import {
  SearchQueryFromIngestionEmbedder,
  SEARCH_QUERY_EMBED_TIMEOUT_MS,
} from '../search-query.from-ingestion.embedder';

function createEmbedder(
  impl: (
    text: string,
    options?: { signal?: AbortSignal },
  ) => Promise<{ embedding: number[]; model: string }>,
): { embedder: Embedder; embed: Mock } {
  const embed = vi.fn(impl);
  return { embedder: { embed }, embed };
}

describe('SearchQueryFromIngestionEmbedder', () => {
  it('embed 성공 시 embedding을 반환한다', async () => {
    const embedding = [0.1, 0.2, 0.3];
    const { embedder } = createEmbedder(() =>
      Promise.resolve({ embedding, model: 'test-model' }),
    );
    const searchQueryEmbedder = new SearchQueryFromIngestionEmbedder(
      embedder,
      1000,
    );

    const result = await searchQueryEmbedder.embed('query');

    expect(result).toEqual(embedding);
  });

  it('embed가 throw하면 null을 반환한다', async () => {
    const { embedder } = createEmbedder(() => {
      throw new Error('embedding failed');
    });
    const searchQueryEmbedder = new SearchQueryFromIngestionEmbedder(
      embedder,
      1000,
    );

    const result = await searchQueryEmbedder.embed('query');

    expect(result).toBeNull();
  });

  it('timeoutMs 안에 응답하지 않는 embedder에 대해 signal이 abort되고 null을 반환하며 대기 시간이 timeoutMs를 크게 초과하지 않는다', async () => {
    const timeoutMs = 20;
    const { embedder } = createEmbedder(
      (_text, options) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(
            () => resolve({ embedding: [1, 2, 3], model: 'test-model' }),
            timeoutMs * 10,
          );
          options?.signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(
              new DOMException('The operation was aborted', 'TimeoutError'),
            );
          });
        }),
    );
    const searchQueryEmbedder = new SearchQueryFromIngestionEmbedder(
      embedder,
      timeoutMs,
    );

    const start = Date.now();
    const result = await searchQueryEmbedder.embed('query');
    const elapsed = Date.now() - start;

    expect(result).toBeNull();
    expect(elapsed).toBeLessThan(timeoutMs * 5);
  });

  it('embedder.embed에 timeoutMs로부터 만든 AbortSignal을 전달한다', async () => {
    const { embedder, embed } = createEmbedder((_text, options) => {
      expect(options?.signal).toBeInstanceOf(AbortSignal);
      return Promise.resolve({ embedding: [1], model: 'test-model' });
    });
    const searchQueryEmbedder = new SearchQueryFromIngestionEmbedder(
      embedder,
      1000,
    );

    await searchQueryEmbedder.embed('query');

    expect(embed).toHaveBeenCalledWith(
      'query',
      expect.objectContaining({
        signal: expect.any(AbortSignal) as AbortSignal,
      }),
    );
  });

  it('timeoutMs를 생략하면 SEARCH_QUERY_EMBED_TIMEOUT_MS 기본값으로 AbortSignal을 만든다', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
    const { embedder } = createEmbedder(() =>
      Promise.resolve({ embedding: [1], model: 'test-model' }),
    );
    const searchQueryEmbedder = new SearchQueryFromIngestionEmbedder(embedder);

    await searchQueryEmbedder.embed('query');

    expect(timeoutSpy).toHaveBeenCalledWith(SEARCH_QUERY_EMBED_TIMEOUT_MS);
    timeoutSpy.mockRestore();
  });
});
