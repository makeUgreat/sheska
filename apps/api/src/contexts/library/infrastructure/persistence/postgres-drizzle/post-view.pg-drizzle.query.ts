import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  type PostViewQuery,
  type PostViewQueryPaginateOptions,
  type PostViewQueryPaginateResult,
} from '@contexts/library/application/ports';
import { classifyPostgresError, DATABASE_TOKENS, sliceForCursor } from '@kernels/infrastructure';
import type * as schema from './schema';

type PostViewListRow = {
  id: string;
  viewed_at: Date;
  ip: string;
  client: string;
};

@Injectable()
export class PostViewPgDrizzleQuery implements PostViewQuery {
  constructor(
    @Inject(DATABASE_TOKENS.drizzleDatabase)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async paginate({ postId, limit, cursor }: PostViewQueryPaginateOptions): Promise<PostViewQueryPaginateResult> {
    // cursor는 id만 담는다. 경계의 viewed_at은 그 id의 행에서 읽는다.
    const afterCursor =
      cursor === null
        ? sql``
        : sql`AND (v.viewed_at, v.id) < (SELECT c.viewed_at, c.id FROM post_views c WHERE c.id = ${cursor.id}::bigint)`;
    let rows: PostViewListRow[];

    try {
      const result = await this.db.execute<PostViewListRow>(sql`
        SELECT v.id::text AS id, v.viewed_at, v.ip, v.client
        FROM post_views v
        WHERE v.post_id = ${postId} ${afterCursor}
        ORDER BY v.viewed_at DESC, v.id DESC
        LIMIT ${limit + 1}
      `);
      rows = result.rows;
    } catch (error: unknown) {
      const ErrorClass = classifyPostgresError(error);
      throw new ErrorClass({
        code: 'post.paginate_views_failed',
        message: 'Post view paginate operation failed',
        details: { id: postId },
        cause: error,
      });
    }

    const { data, nextCursor } = sliceForCursor(rows, limit, (row) => ({ id: row.id }));

    return {
      views: data.map((row) => ({
        viewedAt: new Date(row.viewed_at),
        ip: row.ip,
        client: row.client,
      })),
      nextCursor,
    };
  }
}
