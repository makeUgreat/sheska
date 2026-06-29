import { type ResultAsync } from '@core/result';
import {
  APPLICATION_FAILURE_KIND,
  type ApplicationFailureOf,
} from '@kernels/application';
import { type Source } from '@contexts/sources/domain';

export type SourceRepositoryUnavailableDetails = {
  readonly causeCode: string;
};

export type SourceRepositoryUnavailableFailure = ApplicationFailureOf<
  typeof APPLICATION_FAILURE_KIND.DEPENDENCY_UNAVAILABLE,
  'source_repository',
  'unavailable',
  SourceRepositoryUnavailableDetails
>;

export type SourceRepositoryStateConflictFailure = ApplicationFailureOf<
  typeof APPLICATION_FAILURE_KIND.STATE_CONFLICT,
  'source_repository',
  'state_conflict'
>;

export type SourceRepositoryApplicationFailure =
  | SourceRepositoryUnavailableFailure
  | SourceRepositoryStateConflictFailure;

export type SourceRepositoryFailure = SourceRepositoryApplicationFailure;

export type SourceRepositoryFindCriteria = {
  readonly externalSourceId: string;
};

export interface SourceRepository {
  find(
    criteria: SourceRepositoryFindCriteria,
  ): ResultAsync<Source | null, SourceRepositoryFailure>;

  save(source: Source): ResultAsync<Source, SourceRepositoryFailure>;
}
