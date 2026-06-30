import { eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  type Source,
  type SourceRepository,
  type SourceRepositoryFindCriteria,
} from '@contexts/sources/domain';
import * as schema from './schema';
import { SourcePersistenceMapper } from './source.persistence.mapper';

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
      throw new Error('Source Repository operation failed', { cause: error });
    }

    return row === undefined ? null : SourcePersistenceMapper.toDomain(row);
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
      throw new Error('Source Repository operation failed', { cause: error });
    }

    return SourcePersistenceMapper.toDomain(row);
  }
}
