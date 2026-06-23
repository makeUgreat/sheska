import { Result as ResultUtils, err, ok, type Result } from '@core/result';
import {
  AggregateRoot,
  DOMAIN_ERROR_KIND,
  newId,
  type EntityParams,
} from '@kernels/domain';
import { SourceContentHash } from './source-content-hash.vo';
import {
  type SourceSyncJobDomainError,
  type SourceSyncJobValidationError,
} from './source-sync-job.error';

interface SourceSyncJobProps {
  sourceId: string;
  contentHash: SourceContentHash;
  status: 'pending';
}

export class SourceSyncJob extends AggregateRoot<string, SourceSyncJobProps> {
  private constructor(params: EntityParams<string, SourceSyncJobProps>) {
    super(params);
  }

  static create(params: {
    sourceId: string;
    contentHash: string;
  }): Result<SourceSyncJob, SourceSyncJobDomainError> {
    const { sourceId, contentHash } = params;

    return ResultUtils.combine([
      SourceSyncJob.normalizeSourceId(sourceId),
      SourceContentHash.of(contentHash),
    ]).andThen(([sourceId, contentHash]) =>
      SourceSyncJob.construct({
        params: {
          id: newId(),
          props: {
            sourceId,
            contentHash,
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
