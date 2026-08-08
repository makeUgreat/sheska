import { and, count, desc, eq, lt, or, sql } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  type PostQuery,
  type PostQueryFindCriteria,
  type PostQueryResult,
  type PostQueryCursor,
  type PostQueryPaginateOptions,
  type PostQueryPaginateResult,
  type PostQueryListItem,
  type PostQuerySearchOptions,
  type PostQuerySearchResult,
} from '@contexts/posts/application/ports';
import {
  classifyPostgresError,
  InfrastructureException,
  sliceForCursor,
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

type SearchPostRow = postsSchema.PostRow & {
  searchScore: number;
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

  async paginate({
    limit,
    cursor,
  }: PostQueryPaginateOptions): Promise<PostQueryPaginateResult> {
    const isFirstPage = cursor === null;

    try {
      const baseQuery = this.db
        .select()
        .from(postsSchema.posts)
        .orderBy(desc(postsSchema.posts.id))
        .limit(limit + 1);

      const rows = isFirstPage
        ? await baseQuery
        : await baseQuery.where(lt(postsSchema.posts.id, cursor.id));

      const { data, nextCursor } = sliceForCursor(rows, limit, (row) => ({
        id: row.id,
      }));

      return this.toResult(data, nextCursor);
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'post.paginate_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Post paginate operation failed',
        details: {},
        cause: error,
      });
    }
  }

  // todo: 추후에 score 계산 서브쿼리 최적화 필요성 부하테스트 후 검증
  async search({
    query,
    limit,
    cursor,
  }: PostQuerySearchOptions): Promise<PostQuerySearchResult> {
    const isFirstPage = cursor === null;

    try {
      const score = sql<number>`
        CASE
          WHEN lower(${postsSchema.posts.title}) = lower(${query}) THEN 1
          ELSE 0
        END + GREATEST(
          similarity(${postsSchema.posts.title}, ${query}),
          word_similarity(${query}, ${postsSchema.posts.title})
        )
      `;
      const searchWhere = sql`
        ${postsSchema.posts.title} % ${query}
        OR ${query} <% ${postsSchema.posts.title}
      `;
      const where = isFirstPage
        ? searchWhere
        : and(
            searchWhere,
            or(
              lt(score, cursor.score),
              and(eq(score, cursor.score), lt(postsSchema.posts.id, cursor.id)),
            ),
          );

      const rows = await this.db
        .select({
          id: postsSchema.posts.id,
          sourceId: postsSchema.posts.sourceId,
          title: postsSchema.posts.title,
          viewCount: postsSchema.posts.viewCount,
          createdAt: postsSchema.posts.createdAt,
          updatedAt: postsSchema.posts.updatedAt,
          searchScore: score,
        })
        .from(postsSchema.posts)
        .where(where)
        .orderBy(desc(score), desc(postsSchema.posts.id))
        .limit(limit + 1);

      const { data, nextCursor } = sliceForCursor(rows, limit, (row) => ({
        id: row.id,
        score: row.searchScore,
      }));

      return this.toResult(data, nextCursor);
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'post.search_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Post search operation failed',
        details: { query },
        cause: error,
      });
    }
  }

  async count(): Promise<number> {
    try {
      const [row] = await this.db
        .select({ count: count() })
        .from(postsSchema.posts);
      return row?.count ?? 0;
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'post.count_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Post count operation failed',
        details: {},
        cause: error,
      });
    }
  }

  private toResult<TCursor extends PostQueryCursor>(
    data: Array<postsSchema.PostRow | SearchPostRow>,
    nextCursor: TCursor | null,
  ): { posts: PostQueryListItem[]; nextCursor: TCursor | null } {
    return {
      posts: data.map(
        (row): PostQueryListItem => ({
          postId: row.id,
          sourceId: row.sourceId,
          title: row.title,
          viewCount: row.viewCount,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }),
      ),
      nextCursor,
    };
  }
}
