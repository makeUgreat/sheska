// Tokens used for Dependency Injection
export const SOURCE_EMBEDDING_REPOSITORY = Symbol(
  'SOURCE_EMBEDDING_REPOSITORY',
);
export const SOURCE_EMBEDDING_LOOKUP = Symbol('SOURCE_EMBEDDING_LOOKUP');
export const EMBEDDER = Symbol('EMBEDDER');
export const EMBED_REQUEST_DISPATCHER = Symbol('EMBED_REQUEST_DISPATCHER');
export const EMBED_RESULT_DISPATCHER = Symbol('EMBED_RESULT_DISPATCHER');

export type { SourceEmbeddingRepository } from '@contexts/ingestion/domain';
export type {
  Embedder,
  SourceEmbeddingLookup,
  EmbedRequestDispatcher,
  EmbedResultDispatcher,
} from '@contexts/ingestion/application/ports';
