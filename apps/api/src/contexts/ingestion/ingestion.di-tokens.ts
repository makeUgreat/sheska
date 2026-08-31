// Tokens used for Dependency Injection
export const SOURCE_EMBEDDING_REPOSITORY = Symbol(
  'SOURCE_EMBEDDING_REPOSITORY',
);
export const EMBEDDER = Symbol('EMBEDDER');

export type { SourceEmbeddingRepository } from '@contexts/ingestion/domain';
export type { Embedder } from '@contexts/ingestion/application/ports';
