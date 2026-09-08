import { describe, expect, it, vi, type Mock } from 'vitest';
import { computeDeadline } from '@core/deadline';
import { type CallContext } from '@core/call-context';
import { type Embedder } from '@contexts/ingestion';
import {
  SearchQueryFromIngestionEmbedder,
  SEARCH_QUERY_EMBED_TIMEOUT_MS,
} from '../search-query.from-ingestion.embedder';

function buildContext(remainingMs = 60_000): CallContext {
  return { deadline: computeDeadline(remainingMs) };
}

function createEmbedder(
  impl: (
    text: string,
    context: CallContext,
    attemptTimeoutMs?: number,
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

    const result = await searchQueryEmbedder.embed('query', buildContext());

    expect(result).toEqual(embedding);
  });

  it('감싸고 있는 embedder가 throw하면(retry 소진 포함) null을 반환한다', async () => {
    const { embedder } = createEmbedder(() => {
      throw new Error('embedding failed');
    });
    const searchQueryEmbedder = new SearchQueryFromIngestionEmbedder(
      embedder,
      1000,
    );

    const result = await searchQueryEmbedder.embed('query', buildContext());

    expect(result).toBeNull();
  });

  it('context를 감싸고 있는 embedder에 그대로 전달한다 (자체 retry/timeout 로직을 갖지 않는다)', async () => {
    const { embedder, embed } = createEmbedder(() =>
      Promise.resolve({ embedding: [1], model: 'test-model' }),
    );
    const searchQueryEmbedder = new SearchQueryFromIngestionEmbedder(
      embedder,
      1000,
    );
    const context = buildContext();

    await searchQueryEmbedder.embed('query', context);

    expect(embed).toHaveBeenCalledWith('query', context, 1000);
  });

  it('attemptTimeoutMs를 넘기면 그 값을 감싸고 있는 embedder에 그대로 전달한다', async () => {
    const { embedder, embed } = createEmbedder(() =>
      Promise.resolve({ embedding: [1], model: 'test-model' }),
    );
    const searchQueryEmbedder = new SearchQueryFromIngestionEmbedder(
      embedder,
      1000,
    );
    const context = buildContext();

    await searchQueryEmbedder.embed('query', context, 500);

    expect(embed).toHaveBeenCalledWith('query', context, 500);
  });

  it('attemptTimeoutMs를 생략하면 생성자에 전달된 timeoutMs를 기본값으로 사용한다', async () => {
    const { embedder, embed } = createEmbedder(() =>
      Promise.resolve({ embedding: [1], model: 'test-model' }),
    );
    const searchQueryEmbedder = new SearchQueryFromIngestionEmbedder(embedder);
    const context = buildContext();

    await searchQueryEmbedder.embed('query', context);

    expect(embed).toHaveBeenCalledWith(
      'query',
      context,
      SEARCH_QUERY_EMBED_TIMEOUT_MS,
    );
  });
});
