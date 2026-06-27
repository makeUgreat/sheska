import { type Result } from '@core/result';
import {
  SourceSyncJob,
  type SourceSyncJobDomainError,
} from '@contexts/sources/domain';
import { type SourceSyncJobInsert, type SourceSyncJobRow } from './schema';

export class SourceSyncJobPersistenceMapper {
  static toDomain(
    row: SourceSyncJobRow,
  ): Result<SourceSyncJob, SourceSyncJobDomainError> {
    return SourceSyncJob.restore({
      id: row.id,
      sourceId: row.sourceId,
      fingerprint: row.fingerprint,
      status: row.status,
    });
  }

  static toInsert(syncJob: SourceSyncJob): SourceSyncJobInsert {
    const props = syncJob.getProps();

    return {
      id: syncJob.id,
      sourceId: props.sourceId,
      fingerprint: props.fingerprint.value,
      status: props.status,
    };
  }
}
