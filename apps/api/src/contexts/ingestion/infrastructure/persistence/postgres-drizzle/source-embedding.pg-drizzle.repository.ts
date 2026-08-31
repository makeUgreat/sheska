import { asc, eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  classifyPostgresError,
  InfrastructureException,
} from '@kernels/infrastructure';
import {
  type SourceEmbedding,
  type SourceEmbeddingRepository,
} from '@contexts/ingestion/domain';
import * as schema from './schema';
import { SourceEmbeddingPgDrizzleMapper } from './source-embedding.pg-drizzle.mapper';

const ADAPTER = 'source-embedding.pg-drizzle';

export class SourceEmbeddingPgDrizzleRepository implements SourceEmbeddingRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async find(criteria: { sourceId: string }): Promise<SourceEmbedding | null> {
    const rows = await this.db
      .select()
      .from(schema.sourceEmbeddings)
      .where(eq(schema.sourceEmbeddings.sourceId, criteria.sourceId))
      .orderBy(asc(schema.sourceEmbeddings.chunkIndex));

    return rows.length > 0
      ? SourceEmbeddingPgDrizzleMapper.toDomain(rows)
      : null;
  }

  async save(sourceEmbedding: SourceEmbedding): Promise<void> {
    const inserts = SourceEmbeddingPgDrizzleMapper.toInserts(sourceEmbedding);
    const { sourceId } = inserts[0];

    try {
      await this.db.transaction(async (tx) => {
        await tx
          .delete(schema.sourceEmbeddings)
          .where(eq(schema.sourceEmbeddings.sourceId, sourceId));
        await tx.insert(schema.sourceEmbeddings).values(inserts);
      });
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'source_embedding.save_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source embedding save operation failed',
        details: { sourceId },
        cause: error,
      });
    }
  }
}
