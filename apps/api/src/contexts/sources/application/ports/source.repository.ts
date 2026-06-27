import { type ResultAsync } from '@core/result';
import {
  APPLICATION_ERROR_KIND,
  type ApplicationErrorOf,
} from '@kernels/application';
import { type Source, type SourceDomainError } from '@contexts/sources/domain';

export type SourceRepositoryUnavailableDetails = {
  readonly causeCode: string;
};

export type SourceRepositoryUnavailableError = ApplicationErrorOf<
  typeof APPLICATION_ERROR_KIND.DEPENDENCY_UNAVAILABLE,
  'source_repository',
  'unavailable',
  SourceRepositoryUnavailableDetails
>;

export type SourceRepositoryStateConflictError = ApplicationErrorOf<
  typeof APPLICATION_ERROR_KIND.STATE_CONFLICT,
  'source_repository',
  'state_conflict'
>;

export type SourceRepositoryApplicationError =
  | SourceRepositoryUnavailableError
  | SourceRepositoryStateConflictError;

export type SourceRepositoryError =
  | SourceRepositoryApplicationError
  | SourceDomainError;

export type SourceRepositoryFindCriteria = {
  readonly externalSourceId: string;
};

export interface SourceRepository {
  find(
    criteria: SourceRepositoryFindCriteria,
  ): ResultAsync<Source | null, SourceRepositoryError>;

  save(source: Source): ResultAsync<Source, SourceRepositoryError>;
}
