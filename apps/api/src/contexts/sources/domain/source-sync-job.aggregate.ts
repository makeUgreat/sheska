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
  status: 'pending';
}

export class SourceSyncJob extends AggregateRoot<string, SourceSyncJobProps> {
  private constructor(params: EntityParams<string, SourceSyncJobProps>) {
    super(params);
  }

  static create(params: {
    sourceId: string;
    fingerprint: string;
  }): Result<SourceSyncJob, SourceSyncJobDomainError> {
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
}
