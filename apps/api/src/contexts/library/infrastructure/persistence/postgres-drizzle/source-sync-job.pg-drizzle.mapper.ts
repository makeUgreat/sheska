import { SourceSyncJob } from '@contexts/library/domain';
import { type SourceSyncJobInsert, type SourceSyncJobRow } from './schema';

export class SourceSyncJobPgDrizzleMapper {
  static toDomain(row: SourceSyncJobRow): SourceSyncJob {
    return SourceSyncJob.restore({
      id: row.id,
      sourceId: row.sourceId,
      fingerprint: row.fingerprint,
      status: row.status,
      totalChunks: row.totalChunks,
      createdAt: row.createdAt,
    });
  }

  static toInsert(syncJob: SourceSyncJob): SourceSyncJobInsert {
    const props = syncJob.getProps();

    return {
      id: syncJob.id,
      sourceId: props.sourceId,
      fingerprint: props.fingerprint.unpack(),
      status: props.status,
      totalChunks: props.totalChunks,
    };
  }
}
