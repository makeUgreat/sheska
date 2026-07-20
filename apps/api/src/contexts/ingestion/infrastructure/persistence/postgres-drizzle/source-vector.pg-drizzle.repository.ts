import { asc, eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  classifyPostgresError,
  InfrastructureException,
} from '@kernels/infrastructure';
import {
  type SourceVector,
  type SourceVectorRepository,
} from '@contexts/ingestion/domain';
import * as schema from './schema';
import { SourceVectorPgDrizzleMapper } from './source-vector.pg-drizzle.mapper';

const ADAPTER = 'source-vector.pg-drizzle';

export class SourceVectorPgDrizzleRepository implements SourceVectorRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async find(criteria: { sourceId: string }): Promise<SourceVector | null> {
    const rows = await this.db
      .select()
      .from(schema.sourceVectors)
      .where(eq(schema.sourceVectors.sourceId, criteria.sourceId))
      .orderBy(asc(schema.sourceVectors.chunkIndex));

    return rows.length > 0 ? SourceVectorPgDrizzleMapper.toDomain(rows) : null;
  }

  async save(sourceVector: SourceVector): Promise<void> {
    const inserts = SourceVectorPgDrizzleMapper.toInserts(sourceVector);
    const { sourceId } = inserts[0];

    try {
      await this.db.transaction(async (tx) => {
        await tx
          .delete(schema.sourceVectors)
          .where(eq(schema.sourceVectors.sourceId, sourceId));
        await tx.insert(schema.sourceVectors).values(inserts);
      });
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'source_vector.save_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source vector save operation failed',
        details: { sourceId },
        cause: error,
      });
    }
  }
}
