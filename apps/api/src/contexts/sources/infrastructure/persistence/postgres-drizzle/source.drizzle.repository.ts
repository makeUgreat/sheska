import { eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  type Source,
  type SourceRepository,
  type SourceRepositoryFindCriteria,
} from '@contexts/sources/domain';
import {
  classifyPostgresError,
  InfrastructureException,
  INFRASTRUCTURE_ERROR_KIND,
} from '@kernels/infrastructure';
import * as schema from './schema';
import { SourcePersistenceMapper } from './source.persistence.mapper';

const ADAPTER = 'source.drizzle';

export class SourceDrizzleRepository implements SourceRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async find(criteria: SourceRepositoryFindCriteria): Promise<Source | null> {
    let row: schema.SourceRow | undefined;

    try {
      [row] = await this.db
        .select()
        .from(schema.sources)
        .where(eq(schema.sources.externalSourceId, criteria.externalSourceId))
        .limit(1);
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'source.find_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source find operation failed',
        details: { cause: error },
      });
    }

    if (row === undefined) {
      return null;
    }

    try {
      return SourcePersistenceMapper.toDomain(row);
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: INFRASTRUCTURE_ERROR_KIND.RESTORE_FAILED,
        code: 'source.restore_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source row could not be restored to domain',
        details: { cause: error },
      });
    }
  }

  async save(source: Source): Promise<Source> {
    const sourceInsert = SourcePersistenceMapper.toInsert(source);
    let row: schema.SourceRow;

    try {
      [row] = await this.db
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
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'source.save_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source save operation failed',
        details: { cause: error },
      });
    }

    try {
      return SourcePersistenceMapper.toDomain(row);
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: INFRASTRUCTURE_ERROR_KIND.RESTORE_FAILED,
        code: 'source.restore_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source row could not be restored to domain',
        details: { cause: error },
      });
    }
  }
}
