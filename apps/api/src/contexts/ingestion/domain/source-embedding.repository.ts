import { type SourceEmbedding } from './source-embedding.aggregate';

export interface SourceEmbeddingRepository {
  save(sourceEmbedding: SourceEmbedding): Promise<void>;
  find(criteria: { sourceId: string }): Promise<SourceEmbedding | null>;
}
