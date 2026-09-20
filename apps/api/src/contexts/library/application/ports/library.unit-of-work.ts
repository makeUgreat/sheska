import {
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/library/domain';
import { type OutboxWriter, type UnitOfWork } from '@kernels/application';

export interface LibraryUnitOfWorkResources {
  readonly sources: SourceRepository;
  readonly syncJobs: SourceSyncJobRepository;
  readonly outbox: OutboxWriter;
}

export type LibraryUnitOfWork = UnitOfWork<LibraryUnitOfWorkResources>;
