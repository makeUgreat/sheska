import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  type SourceSyncJob,
  type SourceSyncJobRepository,
} from '@contexts/sources/domain';
import * as schema from './schema';
import { SourceSyncJobPersistenceMapper } from './source-sync-job.persistence.mapper';

export class SourceSyncJobDrizzleRepository implements SourceSyncJobRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async save(syncJob: SourceSyncJob): Promise<SourceSyncJob> {
    const sourceSyncJobInsert =
      SourceSyncJobPersistenceMapper.toInsert(syncJob);
    let row: schema.SourceSyncJobRow;

    try {
      [row] = await this.db
        .insert(schema.sourceSyncJobs)
        .values(sourceSyncJobInsert)
        .returning();
    } catch (error: unknown) {
      throw new Error('Source Sync Job Repository operation failed', {
        cause: error,
      });
    }

    return SourceSyncJobPersistenceMapper.toDomain(row);
  }
}
