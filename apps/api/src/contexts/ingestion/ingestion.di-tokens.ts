// Tokens used for Dependency Injection
export const SOURCE_EMBEDDING_REPOSITORY = Symbol(
  'SOURCE_EMBEDDING_REPOSITORY',
);
export const SOURCE_EMBEDDING_LOOKUP = Symbol('SOURCE_EMBEDDING_LOOKUP');
export const EMBEDDER = Symbol('EMBEDDER');
export const EMBEDDING_WORKFLOW_DISPATCHER = Symbol(
  'EMBEDDING_WORKFLOW_DISPATCHER',
);
export const EMBEDDING_WORKFLOW_PROGRESS_LOOKUP = Symbol(
  'EMBEDDING_WORKFLOW_PROGRESS_LOOKUP',
);
export const INGESTION_UNIT_OF_WORK = Symbol('INGESTION_UNIT_OF_WORK');

export type { SourceEmbeddingRepository } from '@contexts/ingestion/domain';
export type {
  Embedder,
  SourceEmbeddingLookup,
  EmbeddingWorkflowDispatcher,
  EmbeddingWorkflowProgressLookup,
  IngestionUnitOfWork,
} from '@contexts/ingestion/application/ports';
