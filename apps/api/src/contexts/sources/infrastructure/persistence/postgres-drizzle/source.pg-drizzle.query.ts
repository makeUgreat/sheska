import { sql } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  type SourceQuery,
  type SourceQueryCursor,
  type SourceQueryListItem,
  type SourceQueryPaginateOptions,
  type SourceQueryPaginateResult,
} from '@contexts/sources/application/ports';
import {
  classifyPostgresError,
  InfrastructureException,
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
  sync_job_created_at: Date | null;
};

export class SourcePgDrizzleQuery implements SourceQuery {
  constructor(private readonly db: NodePgDatabase<QuerySchema>) {}

  async paginate(
    options?: SourceQueryPaginateOptions,
  ): Promise<SourceQueryPaginateResult> {
    const limit = options?.limit ?? 20;

    try {
      const cursorCondition = options?.cursor
        ? sql`AND (s.created_at < ${options.cursor.createdAt}
            OR (s.created_at = ${options.cursor.createdAt} AND s.id < ${options.cursor.id}))`
        : sql``;

      const result = await this.db.execute<SourceWithLatestJobRow>(sql`
        SELECT
          s.id,
          s.external_source_id,
          s.fingerprint,
          s.size_bytes,
          s.created_at,
          s.updated_at,
          ssj.id           AS sync_job_id,
          ssj.status       AS sync_job_status,
          ssj.created_at   AS sync_job_created_at
        FROM sources s
        LEFT JOIN LATERAL (
          SELECT id, status, created_at
          FROM source_sync_jobs
          WHERE source_id = s.id
          ORDER BY created_at DESC
          LIMIT 1
        ) ssj ON true
        WHERE true ${cursorCondition}
        ORDER BY s.created_at DESC, s.id DESC
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

  private toPaginateResult(
    rows: SourceWithLatestJobRow[],
    limit: number,
  ): SourceQueryPaginateResult {
    const hasNext = rows.length > limit;
    const data = hasNext ? rows.slice(0, limit) : rows;
    const lastRow = data[data.length - 1];
    const nextCursor: SourceQueryCursor | null =
      hasNext && lastRow
        ? { createdAt: new Date(lastRow.created_at), id: lastRow.id }
        : null;

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
                  createdAt: new Date(row.sync_job_created_at),
                }
              : null,
        }),
      ),
      nextCursor,
    };
  }
}
