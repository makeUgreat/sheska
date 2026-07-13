import { eq } from 'drizzle-orm';
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

  async findBySourceId(criteria: {
    sourceId: string;
  }): Promise<SourceVector | null> {
    const row = await this.db
      .select()
      .from(schema.sourceVectors)
      .where(eq(schema.sourceVectors.sourceId, criteria.sourceId))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    return row ? SourceVectorPgDrizzleMapper.toDomain(row) : null;
  }

  async save(sourceVector: SourceVector): Promise<void> {
    const insert = SourceVectorPgDrizzleMapper.toInsert(sourceVector);

    try {
      await this.db
        .insert(schema.sourceVectors)
        .values(insert)
        .onConflictDoUpdate({
          target: schema.sourceVectors.sourceId,
          set: {
            embedding: insert.embedding,
            model: insert.model,
            updatedAt: new Date(),
          },
        });
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'source_vector.save_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source vector upsert operation failed',
        details: { cause: error },
      });
    }
  }
}
