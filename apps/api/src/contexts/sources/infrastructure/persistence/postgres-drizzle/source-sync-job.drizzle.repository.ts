import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { APPLICATION_FAILURE_KIND } from '@kernels/application';
import {
  INFRASTRUCTURE_FAILURE_KIND,
  PostgresRepositoryBase,
  type PostgresInfrastructureFailure,
} from '@kernels/infrastructure';
import { type SourceSyncJob } from '@contexts/sources/domain';
import {
  type SourceSyncJobRepository,
  type SourceSyncJobRepositoryFailure,
} from '@contexts/sources/application/ports';
import * as schema from './schema';
import { SourceSyncJobPersistenceMapper } from './source-sync-job.persistence.mapper';

export class SourceSyncJobDrizzleRepository
  extends PostgresRepositoryBase<
    'source_postgres_persistence',
    'postgres_drizzle'
  >
  implements SourceSyncJobRepository
{
  constructor(private readonly db: NodePgDatabase<typeof schema>) {
    super('source_postgres_persistence', 'postgres_drizzle');
  }

  save(syncJob: SourceSyncJob) {
    return this.runPostgres(async () => {
      const sourceSyncJobInsert =
        SourceSyncJobPersistenceMapper.toInsert(syncJob);

      const [row] = await this.db
        .insert(schema.sourceSyncJobs)
        .values(sourceSyncJobInsert)
        .returning();

      return row;
    })
      .mapErr((failure) => this.mapPostgresFailure(failure))
      .map((row) => SourceSyncJobPersistenceMapper.toDomain(row));
  }

  private mapPostgresFailure(
    failure: PostgresInfrastructureFailure<
      'source_postgres_persistence',
      'postgres_drizzle'
    >,
  ): SourceSyncJobRepositoryFailure {
    if (failure.kind === INFRASTRUCTURE_FAILURE_KIND.CONFLICT) {
      return {
        kind: APPLICATION_FAILURE_KIND.STATE_CONFLICT,
        code: 'source_sync_job_repository.state_conflict',
        message: 'Source Sync Job Repository state conflict',
        details: { causeCode: failure.code },
      };
    }

    return {
      kind: APPLICATION_FAILURE_KIND.DEPENDENCY_UNAVAILABLE,
      code: 'source_sync_job_repository.unavailable',
      message: 'Source Sync Job Repository is unavailable',
      details: { causeCode: failure.code },
    };
  }
}
