import { type SourceEmbedding } from './source-embedding.aggregate';

export interface SourceEmbeddingUpsertResult {
  readonly replaced: boolean;
}

export interface SourceEmbeddingRepository {
  upsert(
    sourceEmbedding: SourceEmbedding,
  ): Promise<SourceEmbeddingUpsertResult>;
  find(criteria: { sourceId: string }): Promise<SourceEmbedding | null>;
}
