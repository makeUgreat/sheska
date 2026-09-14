import {
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/sources/domain';
import { type OutboxWriter, type UnitOfWork } from '@kernels/application';

export interface SourcesUnitOfWorkResources {
  readonly sources: SourceRepository;
  readonly syncJobs: SourceSyncJobRepository;
  readonly outbox: OutboxWriter;
}

export type SourcesUnitOfWork = UnitOfWork<SourcesUnitOfWorkResources>;
