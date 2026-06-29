import { eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { APPLICATION_FAILURE_KIND } from '@kernels/application';
import {
  INFRASTRUCTURE_FAILURE_KIND,
  PostgresRepositoryBase,
  type PostgresInfrastructureFailure,
} from '@kernels/infrastructure';
import { type Source } from '@contexts/sources/domain';
import {
  type SourceRepository,
  type SourceRepositoryFailure,
  type SourceRepositoryFindCriteria,
} from '@contexts/sources/application/ports';
import * as schema from './schema';
import { SourcePersistenceMapper } from './source.persistence.mapper';

export class SourceDrizzleRepository
  extends PostgresRepositoryBase<
    'source_postgres_persistence',
    'postgres_drizzle'
  >
  implements SourceRepository
{
  constructor(private readonly db: NodePgDatabase<typeof schema>) {
    super('source_postgres_persistence', 'postgres_drizzle');
  }

  find(criteria: SourceRepositoryFindCriteria) {
    return this.runPostgres(async () => {
      const [row] = await this.db
        .select()
        .from(schema.sources)
        .where(eq(schema.sources.externalSourceId, criteria.externalSourceId))
        .limit(1);

      return row ?? null;
    })
      .mapErr((failure) => this.mapPostgresFailure(failure))
      .map((row) =>
        row === null ? null : SourcePersistenceMapper.toDomain(row),
      );
  }

  save(source: Source) {
    return this.runPostgres(async () => {
      const sourceInsert = SourcePersistenceMapper.toInsert(source);
      const [row] = await this.db
        .insert(schema.sources)
        .values(sourceInsert)
        .onConflictDoUpdate({
          target: schema.sources.id,
          set: {
            externalSourceId: sourceInsert.externalSourceId,
            content: sourceInsert.content,
            fingerprint: sourceInsert.fingerprint,
            sizeBytes: sourceInsert.sizeBytes,
            updatedAt: new Date(),
          },
        })
        .returning();

      return row;
    })
      .mapErr((failure) => this.mapPostgresFailure(failure))
      .map((row) => SourcePersistenceMapper.toDomain(row));
  }

  private mapPostgresFailure(
    failure: PostgresInfrastructureFailure<
      'source_postgres_persistence',
      'postgres_drizzle'
    >,
  ): SourceRepositoryFailure {
    if (failure.kind === INFRASTRUCTURE_FAILURE_KIND.CONFLICT) {
      return {
        kind: APPLICATION_FAILURE_KIND.STATE_CONFLICT,
        code: 'source_repository.state_conflict',
        message: 'Source Repository state conflict',
        details: { causeCode: failure.code },
      };
    }

    return {
      kind: APPLICATION_FAILURE_KIND.DEPENDENCY_UNAVAILABLE,
      code: 'source_repository.unavailable',
      message: 'Source Repository is unavailable',
      details: { causeCode: failure.code },
    };
  }
}
