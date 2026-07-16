import { sql } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  type PostQuery,
  type PostQueryFindCriteria,
  type PostQueryResult,
} from '@contexts/posts/application/ports';
import {
  classifyPostgresError,
  InfrastructureException,
} from '@kernels/infrastructure';
import * as postsSchema from './schema';

type QuerySchema = typeof postsSchema;

const ADAPTER = 'post.pg-drizzle';

type PostWithSourceRow = {
  post_id: string;
  source_id: string;
  title: string;
  view_count: number;
  created_at: Date;
  updated_at: Date;
  source_content: string;
};

export class PostPgDrizzleQuery implements PostQuery {
  constructor(private readonly db: NodePgDatabase<QuerySchema>) {}

  async get(criteria: PostQueryFindCriteria): Promise<PostQueryResult> {
    const result = await this.find(criteria);
    if (result === null) {
      throw new InfrastructureException({
        kind: 'not_found',
        code: 'post.get_with_source_not_found',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Post not found',
        details: { id: criteria.id },
      });
    }
    return result;
  }

  async find(criteria: PostQueryFindCriteria): Promise<PostQueryResult | null> {
    let rows: PostWithSourceRow[];

    try {
      const result = await this.db.execute<PostWithSourceRow>(sql`
        SELECT
          p.id          AS post_id,
          p.source_id,
          p.title,
          p.view_count,
          p.created_at,
          p.updated_at,
          s.content     AS source_content
        FROM posts p
        INNER JOIN sources s ON p.source_id = s.id
        WHERE p.id = ${criteria.id}
        LIMIT 1
      `);
      rows = result.rows;
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'post.get_with_source_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Post find query operation failed',
        details: { id: criteria.id },
        cause: error,
      });
    }

    const row = rows[0];
    if (row === undefined) {
      return null;
    }

    return {
      postId: row.post_id,
      sourceId: row.source_id,
      title: row.title,
      viewCount: row.view_count,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      sourceContent: row.source_content,
    };
  }
}
