import {
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/sources/domain';
import { type UnitOfWork } from '@kernels/application';

export interface SourcesUnitOfWorkResources {
  readonly sources: SourceRepository;
  readonly syncJobs: SourceSyncJobRepository;
}

export type SourcesUnitOfWork = UnitOfWork<SourcesUnitOfWorkResources>;
