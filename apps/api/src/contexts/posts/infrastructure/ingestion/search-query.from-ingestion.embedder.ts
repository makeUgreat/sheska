import { type CallContext } from '@core/call-context';
import { type Embedder } from '@contexts/ingestion/ingestion.di-tokens';
import { type SearchQueryEmbedder } from '@contexts/posts/application/ports';

// Interactive search should feel snappy; if embedding takes longer than this,
// fall back to FTS-only rather than making the user wait. Measured warm-state
// embedding latency for qwen3-embedding:0.6b is ~470-500ms, so the budget
// needs headroom above that rather than sitting below it.
export const SEARCH_QUERY_EMBED_TIMEOUT_MS = 1000;

export class SearchQueryFromIngestionEmbedder implements SearchQueryEmbedder {
  constructor(
    private readonly embedder: Embedder,
    private readonly timeoutMs: number = SEARCH_QUERY_EMBED_TIMEOUT_MS,
  ) {}

  async embed(
    query: string,
    context: CallContext,
    attemptTimeoutMs: number = this.timeoutMs,
  ): Promise<number[] | null> {
    try {
      const { embedding } = await this.embedder.embed(
        query,
        context,
        attemptTimeoutMs,
      );
      return embedding;
    } catch {
      return null;
    }
  }
}
