import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { type PostSummary, type PostSummaryRepository, type PostSummaryRepositoryFindCriteria } from '@contexts/library/domain';
import { classifyPostgresError, DATABASE_TOKENS } from '@kernels/infrastructure';
import * as schema from './schema';
import { PostSummaryPgDrizzleMapper } from './post-summary.pg-drizzle.mapper';

@Injectable()
export class PostSummaryPgDrizzleRepository implements PostSummaryRepository {
  constructor(
    @Inject(DATABASE_TOKENS.drizzleDatabase)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async find(criteria: PostSummaryRepositoryFindCriteria): Promise<PostSummary | null> {
    let row: schema.PostSummaryRow | undefined;

    try {
      [row] = await this.db.select().from(schema.postSummaries).where(eq(schema.postSummaries.postId, criteria.postId)).limit(1);
    } catch (error: unknown) {
      const ErrorClass = classifyPostgresError(error);
      throw new ErrorClass({
        code: 'post_summary.find_failed',
        message: 'Post summary find operation failed',
        details: { postId: criteria.postId },
        cause: error,
      });
    }

    return row === undefined ? null : PostSummaryPgDrizzleMapper.toDomain(row);
  }

  async upsert(summary: PostSummary): Promise<PostSummary> {
    const summaryInsert = PostSummaryPgDrizzleMapper.toInsert(summary);
    let row: schema.PostSummaryRow;

    try {
      [row] = await this.db
        .insert(schema.postSummaries)
        .values(summaryInsert)
        .onConflictDoUpdate({
          target: schema.postSummaries.postId,
          set: {
            fingerprint: summaryInsert.fingerprint,
            sentences: summaryInsert.sentences,
            model: summaryInsert.model,
            finishedAt: summaryInsert.finishedAt,
          },
        })
        .returning();
    } catch (error: unknown) {
      const ErrorClass = classifyPostgresError(error);
      throw new ErrorClass({
        code: 'post_summary.upsert_failed',
        message: 'Post summary upsert operation failed',
        details: { postId: summaryInsert.postId },
        cause: error,
      });
    }

    return PostSummaryPgDrizzleMapper.toDomain(row);
  }
}
