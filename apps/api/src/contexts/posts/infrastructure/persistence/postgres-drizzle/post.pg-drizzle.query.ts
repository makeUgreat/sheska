import { count, desc, lt, sql } from 'drizzle-orm';
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
const TITLE_SEARCH_WEIGHT = 1;
const CONTENT_SEARCH_WEIGHT = 0.4;
const RRF_K = 60;
const CANDIDATE_POOL_SIZE = 50;

type PostWithSourceRow = {
  post_id: string;
  source_id: string;
  title: string;
  view_count: number;
  created_at: Date;
  updated_at: Date;
  source_content: string;
};

type SearchPostRow = {
  id: string;
  sourceId: string;
  title: string;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
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
    queryEmbedding,
  }: PostQuerySearchOptions): Promise<PostQuerySearchResult> {
    const isFirstPage = cursor === null;

    try {
      const result =
        queryEmbedding === null
          ? await this.searchByFts(query, limit, cursor, isFirstPage)
          : await this.searchHybrid(
              query,
              queryEmbedding,
              limit,
              cursor,
              isFirstPage,
            );

      const rows = result.rows.map((row) => ({
        ...row,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      }));

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

  private async searchByFts(
    query: string,
    limit: number,
    cursor: PostQuerySearchOptions['cursor'],
    isFirstPage: boolean,
  ) {
    const tsQuery = sql`bigram_tsquery(${query})`;
    const score = sql`
      ts_rank(p.title_search_vector, ${tsQuery}, 2) * ${TITLE_SEARCH_WEIGHT}
      + ts_rank(s.content_search_vector, ${tsQuery}, 2) * ${CONTENT_SEARCH_WEIGHT}
    `;
    const matchWhere = sql`(
      p.title_search_vector @@ ${tsQuery}
      OR s.content_search_vector @@ ${tsQuery}
    )`;
    const where =
      isFirstPage || cursor === null
        ? matchWhere
        : sql`${matchWhere} AND (
            (${score}) < ${cursor.score}
            OR ((${score}) = ${cursor.score} AND p.id < ${cursor.id})
          )`;

    return this.db.execute<SearchPostRow>(sql`
      SELECT
        p.id         AS "id",
        p.source_id  AS "sourceId",
        p.title      AS "title",
        p.view_count AS "viewCount",
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        (${score})   AS "searchScore"
      FROM posts p
      INNER JOIN sources s ON p.source_id = s.id
      WHERE ${where}
      ORDER BY "searchScore" DESC, p.id DESC
      LIMIT ${limit + 1}
    `);
  }

  private async searchHybrid(
    query: string,
    queryEmbedding: number[],
    limit: number,
    cursor: PostQuerySearchOptions['cursor'],
    isFirstPage: boolean,
  ) {
    const tsQuery = sql`bigram_tsquery(${query})`;
    const embeddingLiteral = `[${queryEmbedding.join(',')}]`;
    const ftsScore = sql`
      ts_rank(p.title_search_vector, ${tsQuery}, 2) * ${TITLE_SEARCH_WEIGHT}
      + ts_rank(s.content_search_vector, ${tsQuery}, 2) * ${CONTENT_SEARCH_WEIGHT}
    `;
    const matchWhere = sql`(
      p.title_search_vector @@ ${tsQuery}
      OR s.content_search_vector @@ ${tsQuery}
    )`;
    const rrfScore = sql`(
      COALESCE(1.0 / (${RRF_K} + f.fts_rank), 0)
      + COALESCE(1.0 / (${RRF_K} + e.embedding_rank), 0)
    )::double precision`;
    const cursorWhere =
      isFirstPage || cursor === null
        ? sql``
        : sql`WHERE (
            ("searchScore") < ${cursor.score}
            OR (("searchScore") = ${cursor.score} AND "id" < ${cursor.id})
          )`;

    return this.db.execute<SearchPostRow>(sql`
      WITH fts_candidates AS (
        SELECT
          p.id, p.source_id, p.title, p.view_count, p.created_at, p.updated_at,
          RANK() OVER (ORDER BY (${ftsScore}) DESC) AS fts_rank
        FROM posts p
        INNER JOIN sources s ON p.source_id = s.id
        WHERE ${matchWhere}
        ORDER BY fts_rank
        LIMIT ${CANDIDATE_POOL_SIZE}
      ),
      embedding_candidates AS (
        SELECT
          p.id, p.source_id, p.title, p.view_count, p.created_at, p.updated_at,
          RANK() OVER (
            ORDER BY MIN(se.embedding <=> ${embeddingLiteral}::vector)
          ) AS embedding_rank
        FROM posts p
        INNER JOIN source_embeddings se ON se.source_id = p.source_id
        GROUP BY p.id, p.source_id, p.title, p.view_count, p.created_at, p.updated_at
        ORDER BY embedding_rank
        LIMIT ${CANDIDATE_POOL_SIZE}
      ),
      fused AS (
        SELECT
          COALESCE(f.id, e.id)                 AS "id",
          COALESCE(f.source_id, e.source_id)   AS "sourceId",
          COALESCE(f.title, e.title)           AS "title",
          COALESCE(f.view_count, e.view_count) AS "viewCount",
          COALESCE(f.created_at, e.created_at) AS "createdAt",
          COALESCE(f.updated_at, e.updated_at) AS "updatedAt",
          (${rrfScore})                        AS "searchScore"
        FROM fts_candidates f
        FULL OUTER JOIN embedding_candidates e ON f.id = e.id
      )
      SELECT * FROM fused
      ${cursorWhere}
      ORDER BY "searchScore" DESC, "id" DESC
      LIMIT ${limit + 1}
    `);
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
