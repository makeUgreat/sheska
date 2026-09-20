import { type SourceEmbedding } from './source-embedding.aggregate';

export interface SourceEmbeddingRepository {
  upsert(sourceEmbedding: SourceEmbedding): Promise<void>;
  find(criteria: { sourceId: string }): Promise<SourceEmbedding | null>;
}
