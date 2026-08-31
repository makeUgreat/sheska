import { type Embedder } from '@contexts/ingestion/ingestion.di-tokens';
import { type SearchQueryEmbedder } from '@contexts/posts/application/ports';

// Interactive search should feel snappy; if embedding takes longer than this,
// fall back to FTS-only rather than making the user wait.
export const SEARCH_QUERY_EMBED_TIMEOUT_MS = 300;

export class SearchQueryFromIngestionEmbedder implements SearchQueryEmbedder {
  constructor(
    private readonly embedder: Embedder,
    private readonly timeoutMs: number = SEARCH_QUERY_EMBED_TIMEOUT_MS,
  ) {}

  async embed(query: string): Promise<number[] | null> {
    try {
      const { embedding } = await this.embedder.embed(query, {
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      return embedding;
    } catch {
      return null;
    }
  }
}
