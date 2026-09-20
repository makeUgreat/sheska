import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import {
  type SourceSyncJob,
  type SourceSyncJobRepository,
} from '@contexts/library/domain';
import {
  classifyPostgresError,
  DATABASE_TOKENS,
  INFRASTRUCTURE_ERROR_KIND,
  InfrastructureException,
  type PgDrizzleSession,
} from '@kernels/infrastructure';
import * as schema from './schema';
import { SourceSyncJobPgDrizzleMapper } from './source-sync-job.pg-drizzle.mapper';

const ADAPTER = 'source-sync-job.pg-drizzle';

@Injectable()
export class SourceSyncJobPgDrizzleRepository implements SourceSyncJobRepository {
  constructor(
    @Inject(DATABASE_TOKENS.drizzleDatabase)
    private readonly db: PgDrizzleSession<typeof schema>,
  ) {}

  async get(criteria: { id: string }): Promise<SourceSyncJob> {
    const syncJob = await this.find(criteria);
    if (!syncJob) {
      throw new InfrastructureException({
        kind: INFRASTRUCTURE_ERROR_KIND.NOT_FOUND,
        code: 'source_sync_job.not_found',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source sync job not found',
        details: { id: criteria.id },
      });
    }
    return syncJob;
  }

  async find(criteria: { id: string }): Promise<SourceSyncJob | null> {
    const row = await this.db
      .select()
      .from(schema.sourceSyncJobs)
      .where(eq(schema.sourceSyncJobs.id, criteria.id))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    return row ? SourceSyncJobPgDrizzleMapper.toDomain(row) : null;
  }

  async findLatest(criteria: {
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

  async insert(syncJob: SourceSyncJob): Promise<SourceSyncJob> {
    const insert = SourceSyncJobPgDrizzleMapper.toInsert(syncJob);
    let row: schema.SourceSyncJobRow;

    try {
      [row] = await this.db
        .insert(schema.sourceSyncJobs)
        .values(insert)
        .returning();
    } catch (error: unknown) {
      const kind = classifyPostgresError(error);
      if (kind === INFRASTRUCTURE_ERROR_KIND.CONSTRAINT_VIOLATION) {
        throw new InfrastructureException({
          kind,
          code: 'source_sync_job.already_active',
          source: { boundary: 'persistence', adapter: ADAPTER },
          message:
            'An active sync job for the same source and fingerprint already exists',
          details: {
            sourceId: insert.sourceId,
            fingerprint: insert.fingerprint,
          },
        });
      }

      throw new InfrastructureException({
        kind,
        code: 'source_sync_job.insert_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source sync job insert operation failed',
        details: { id: insert.id },
        cause: error,
      });
    }

    return SourceSyncJobPgDrizzleMapper.toDomain(row);
  }

  async update(syncJob: SourceSyncJob): Promise<SourceSyncJob> {
    const insert = SourceSyncJobPgDrizzleMapper.toInsert(syncJob);
    let row: schema.SourceSyncJobRow | undefined;

    try {
      [row] = await this.db
        .update(schema.sourceSyncJobs)
        .set({ status: insert.status, totalChunks: insert.totalChunks })
        .where(eq(schema.sourceSyncJobs.id, insert.id))
        .returning();
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'source_sync_job.update_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source sync job update operation failed',
        details: { id: insert.id },
        cause: error,
      });
    }

    if (row === undefined) {
      throw new InfrastructureException({
        kind: INFRASTRUCTURE_ERROR_KIND.NOT_FOUND,
        code: 'source_sync_job.not_found',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source sync job not found',
        details: { id: insert.id },
      });
    }

    return SourceSyncJobPgDrizzleMapper.toDomain(row);
  }
}
