import { type OutboxWriter, type UnitOfWork } from '@kernels/application';
import { type SourceEmbeddingRepository } from '@contexts/ingestion/domain';

export interface IngestionUnitOfWorkResources {
  readonly sourceEmbeddings: SourceEmbeddingRepository;
  readonly outbox: OutboxWriter;
}

export type IngestionUnitOfWork = UnitOfWork<IngestionUnitOfWorkResources>;
