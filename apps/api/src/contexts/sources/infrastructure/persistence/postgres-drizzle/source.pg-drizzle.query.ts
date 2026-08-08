import { sql } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  type SourceQuery,
  type SourceQueryListItem,
  type SourceQueryPaginateOptions,
  type SourceQueryPaginateResult,
} from '@contexts/sources/application/ports';
import {
  classifyPostgresError,
  InfrastructureException,
  sliceForCursor,
} from '@kernels/infrastructure';
import * as schema from './schema';

type QuerySchema = typeof schema;

const ADAPTER = 'source.pg-drizzle';

type SourceWithLatestJobRow = {
  id: string;
  external_source_id: string;
  fingerprint: string;
  size_bytes: number;
  created_at: Date;
  updated_at: Date;
  sync_job_id: string | null;
  sync_job_status: string | null;
  sync_job_total_chunks: number | null;
  sync_job_processed_chunks: number | null;
  sync_job_created_at: Date | null;
  published_post_id: string | null;
};

export class SourcePgDrizzleQuery implements SourceQuery {
  constructor(private readonly db: NodePgDatabase<QuerySchema>) {}

  async paginate({
    limit,
    cursor,
  }: SourceQueryPaginateOptions): Promise<SourceQueryPaginateResult> {
    const isFirstPage = cursor === null;

    try {
      const cursorCondition = isFirstPage
        ? sql``
        : sql`AND s.id < ${cursor.id}`;

      const result = await this.db.execute<SourceWithLatestJobRow>(sql`
        SELECT
          s.id,
          s.external_source_id,
          s.fingerprint,
          s.size_bytes,
          s.created_at,
          s.updated_at,
          ssj.id                AS sync_job_id,
          ssj.status            AS sync_job_status,
          ssj.total_chunks      AS sync_job_total_chunks,
          ssj.processed_chunks  AS sync_job_processed_chunks,
          ssj.created_at        AS sync_job_created_at,
          p.id                  AS published_post_id
        FROM sources s
        LEFT JOIN LATERAL (
          SELECT id, status, total_chunks, processed_chunks, created_at
          FROM source_sync_jobs
          WHERE source_id = s.id
          ORDER BY created_at DESC
          LIMIT 1
        ) ssj ON true
        LEFT JOIN posts p ON p.source_id = s.id
        WHERE true ${cursorCondition}
        ORDER BY s.id DESC
        LIMIT ${limit + 1}
      `);

      return this.toPaginateResult(result.rows, limit);
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'source.paginate_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source paginate operation failed',
        details: {},
        cause: error,
      });
    }
  }

  async find(criteria: { sourceId: string }): Promise<string | null> {
    try {
      const result = await this.db.execute<{ id: string }>(sql`
        SELECT id FROM posts WHERE source_id = ${criteria.sourceId} LIMIT 1
      `);
      return result.rows[0]?.id ?? null;
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'source.find_published_post_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source find published post operation failed',
        details: { sourceId: criteria.sourceId },
        cause: error,
      });
    }
  }

  private toPaginateResult(
    rows: SourceWithLatestJobRow[],
    limit: number,
  ): SourceQueryPaginateResult {
    const { data, nextCursor } = sliceForCursor(rows, limit, (row) => ({
      id: row.id,
    }));

    return {
      sources: data.map(
        (row): SourceQueryListItem => ({
          sourceId: row.id,
          externalSourceId: row.external_source_id,
          fingerprint: row.fingerprint,
          sizeBytes: row.size_bytes,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          latestSyncJob:
            row.sync_job_id && row.sync_job_status && row.sync_job_created_at
              ? {
                  syncJobId: row.sync_job_id,
                  status: row.sync_job_status,
                  totalChunks: row.sync_job_total_chunks,
                  processedChunks: row.sync_job_processed_chunks ?? 0,
                  createdAt: new Date(row.sync_job_created_at),
                }
              : null,
          publishedPostId: row.published_post_id,
        }),
      ),
      nextCursor,
    };
  }
}
