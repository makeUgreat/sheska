import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  classifyPostgresError,
  DATABASE_TOKENS,
  InfrastructureException,
  withTransactionRetry,
  type TransactionRetryPolicy,
} from '@kernels/infrastructure';
import {
  type SourceEmbedding,
  type SourceEmbeddingRepository,
} from '@contexts/ingestion/domain';
import * as schema from './schema';
import type { SourceEmbeddingInsert } from './schema';
import { SourceEmbeddingPgDrizzleMapper } from './source-embedding.pg-drizzle.mapper';

const ADAPTER = 'source-embedding.pg-drizzle';
const SOURCE_EMBEDDING_SAVE_TRANSACTION_RETRY_POLICY: TransactionRetryPolicy = {
  maxRetries: 3,
  baseDelayMs: 20,
};

@Injectable()
export class SourceEmbeddingPgDrizzleRepository implements SourceEmbeddingRepository {
  constructor(
    @Inject(DATABASE_TOKENS.drizzleDatabase)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

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

    await withTransactionRetry(() => this.saveOnce(sourceId, inserts), {
      policy: SOURCE_EMBEDDING_SAVE_TRANSACTION_RETRY_POLICY,
    });
  }

  private async saveOnce(
    sourceId: string,
    inserts: SourceEmbeddingInsert[],
  ): Promise<void> {
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
