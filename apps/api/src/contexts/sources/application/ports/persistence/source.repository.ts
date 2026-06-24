import { type ResultAsync } from '@core/result';
import {
  APPLICATION_ERROR_KIND,
  type ApplicationErrorOf,
} from '@kernels/application';
import { type Source } from '@contexts/sources/domain';

export type SourceRepositoryUnavailableError = ApplicationErrorOf<
  typeof APPLICATION_ERROR_KIND.DEPENDENCY_UNAVAILABLE,
  'source_repository',
  'unavailable'
>;

export type SourceRepositoryStateConflictError = ApplicationErrorOf<
  typeof APPLICATION_ERROR_KIND.STATE_CONFLICT,
  'source_repository',
  'state_conflict'
>;

export type SourceRepositoryError =
  | SourceRepositoryUnavailableError
  | SourceRepositoryStateConflictError;

export interface SourceRepository {
  findByExternalSourceId(
    externalSourceId: string,
  ): ResultAsync<Source | null, SourceRepositoryError>;

  save(source: Source): ResultAsync<Source, SourceRepositoryError>;
}
