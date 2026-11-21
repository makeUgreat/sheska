import { type PostRepository, type SourceRepository, type SourceSyncJobRepository } from '@contexts/library/domain';
import { type OutboxWriter, type UnitOfWork } from '@kernels/application';

export interface LibraryUnitOfWorkResources {
  readonly sources: SourceRepository;
  readonly syncJobs: SourceSyncJobRepository;
  readonly posts: PostRepository;
  readonly outbox: OutboxWriter;
}

export type LibraryUnitOfWork = UnitOfWork<LibraryUnitOfWorkResources>;
