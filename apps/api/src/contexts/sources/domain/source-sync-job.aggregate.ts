import { Result as ResultUtils, err, ok, type Result } from '@core/result';
import {
  AggregateRoot,
  DOMAIN_ERROR_KIND,
  newId,
  type EntityParams,
} from '@kernels/domain';
import { SourceFingerprint } from './source-fingerprint.vo';
import {
  type SourceSyncJobDomainError,
  type SourceSyncJobValidationError,
} from './source-sync-job.error';

interface SourceSyncJobProps {
  sourceId: string;
  fingerprint: SourceFingerprint;
  status: SourceSyncJobStatus;
}

type SourceSyncJobStatus = 'pending';

interface SourceSyncJobCreateParams {
  sourceId: string;
  fingerprint: string;
}

interface SourceSyncJobRestoreParams {
  id: string;
  sourceId: string;
  fingerprint: string;
  status: string;
}

export class SourceSyncJob extends AggregateRoot<string, SourceSyncJobProps> {
  private constructor(params: EntityParams<string, SourceSyncJobProps>) {
    super(params);
  }

  static create(
    params: SourceSyncJobCreateParams,
  ): Result<SourceSyncJob, SourceSyncJobDomainError> {
    const { sourceId, fingerprint } = params;

    return ResultUtils.combine([
      SourceSyncJob.normalizeSourceId(sourceId),
      SourceFingerprint.of(fingerprint),
    ]).andThen(([sourceId, fingerprint]) =>
      SourceSyncJob.construct({
        params: {
          id: newId(),
          props: {
            sourceId,
            fingerprint,
            status: 'pending',
          },
        },
        validate: (entityParams) => ok(entityParams),
      }),
    );
  }

  static restore(
    params: SourceSyncJobRestoreParams,
  ): Result<SourceSyncJob, SourceSyncJobDomainError> {
    const { id, sourceId, fingerprint, status } = params;

    return ResultUtils.combine([
      SourceSyncJob.normalizeSourceId(sourceId),
      SourceFingerprint.of(fingerprint),
      SourceSyncJob.normalizeStatus(status),
    ]).andThen(([sourceId, fingerprint, status]) =>
      SourceSyncJob.construct({
        params: {
          id,
          props: {
            sourceId,
            fingerprint,
            status,
          },
        },
        validate: (entityParams) => ok(entityParams),
      }),
    );
  }

  private static normalizeSourceId(
    sourceId: string,
  ): Result<string, SourceSyncJobValidationError> {
    const normalizedSourceId = sourceId.trim();

    if (normalizedSourceId.length > 0) {
      return ok(normalizedSourceId);
    }

    return err({
      kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
      code: 'source_sync_job.source_id_empty',
      message: 'Source sync job source id cannot be empty',
      details: { fields: ['sourceId'] },
    } satisfies SourceSyncJobValidationError);
  }

  private static normalizeStatus(
    status: string,
  ): Result<SourceSyncJobStatus, SourceSyncJobValidationError> {
    if (status === 'pending') {
      return ok(status);
    }

    return err({
      kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
      code: 'source_sync_job.status_invalid',
      message: 'Source sync job status is invalid',
      details: { fields: ['status'] },
    } satisfies SourceSyncJobValidationError);
  }
}
