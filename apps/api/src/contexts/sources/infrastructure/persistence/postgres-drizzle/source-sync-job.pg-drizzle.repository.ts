import { desc, eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  type SourceSyncJob,
  type SourceSyncJobRepository,
} from '@contexts/sources/domain';
import {
  classifyPostgresError,
  InfrastructureException,
} from '@kernels/infrastructure';
import * as schema from './schema';
import { SourceSyncJobPgDrizzleMapper } from './source-sync-job.pg-drizzle.mapper';

const ADAPTER = 'source-sync-job.pg-drizzle';

export class SourceSyncJobPgDrizzleRepository implements SourceSyncJobRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async find(criteria: { id: string }): Promise<SourceSyncJob | null> {
    const row = await this.db
      .select()
      .from(schema.sourceSyncJobs)
      .where(eq(schema.sourceSyncJobs.id, criteria.id))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    return row ? SourceSyncJobPgDrizzleMapper.toDomain(row) : null;
  }

  async findLatestBySourceId(criteria: {
    sourceId: string;
  }): Promise<SourceSyncJob | null> {
    const row = await this.db
      .select()
      .from(schema.sourceSyncJobs)
      .where(eq(schema.sourceSyncJobs.sourceId, criteria.sourceId))
      .orderBy(desc(schema.sourceSyncJobs.createdAt))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    return row ? SourceSyncJobPgDrizzleMapper.toDomain(row) : null;
  }

  async save(syncJob: SourceSyncJob): Promise<SourceSyncJob> {
    const insert = SourceSyncJobPgDrizzleMapper.toInsert(syncJob);
    let row: schema.SourceSyncJobRow;

    try {
      [row] = await this.db
        .insert(schema.sourceSyncJobs)
        .values(insert)
        .onConflictDoUpdate({
          target: schema.sourceSyncJobs.id,
          set: { status: insert.status },
        })
        .returning();
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'source_sync_job.save_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source sync job save operation failed',
        details: { cause: error },
      });
    }

    return SourceSyncJobPgDrizzleMapper.toDomain(row);
  }
}
