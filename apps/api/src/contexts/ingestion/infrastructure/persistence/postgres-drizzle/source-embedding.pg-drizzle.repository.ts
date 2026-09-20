import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { ConcurrencyConflictError } from '@core/errors';
import {
  classifyPostgresError,
  DATABASE_TOKENS,
  resiliencePipeline,
} from '@kernels/infrastructure';
import {
  type SourceEmbedding,
  type SourceEmbeddingRepository,
} from '@contexts/ingestion/domain';
import * as schema from './schema';
import type { SourceEmbeddingInsert } from './schema';
import { SourceEmbeddingPgDrizzleMapper } from './source-embedding.pg-drizzle.mapper';

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

  async upsert(sourceEmbedding: SourceEmbedding): Promise<void> {
    const inserts = SourceEmbeddingPgDrizzleMapper.toInserts(sourceEmbedding);
    const { sourceId } = inserts[0];

    await resiliencePipeline()
      .retry({
        maxRetries: 3,
        baseDelayMs: 20,
        maxDelayMs: 20,
        classify: (error) => ({
          retryable: error instanceof ConcurrencyConflictError,
        }),
      })
      .execute(() => this.replaceOnce(sourceId, inserts));
  }

  private async replaceOnce(
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
      const ErrorClass = classifyPostgresError(error);
      throw new ErrorClass({
        code: 'source_embedding.upsert_failed',
        message: 'Source embedding save operation failed',
        details: { sourceId },
        cause: error,
      });
    }
  }
}
