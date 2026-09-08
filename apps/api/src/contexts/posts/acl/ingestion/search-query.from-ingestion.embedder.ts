import { type CallContext } from '@core/call-context';
import { type Embedder } from '@contexts/ingestion';
import { type SearchQueryEmbedder } from '@contexts/posts/application/ports';

export class SearchQueryFromIngestionEmbedder implements SearchQueryEmbedder {
  constructor(private readonly embedder: Embedder) {}

  async embed(query: string, context: CallContext): Promise<number[] | null> {
    try {
      const { embedding } = await this.embedder.embed(query, context);
      return embedding;
    } catch {
      return null;
    }
  }
}
