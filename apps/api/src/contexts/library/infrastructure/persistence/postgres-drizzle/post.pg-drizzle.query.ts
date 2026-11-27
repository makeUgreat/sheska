import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, inArray, lt, sql, type SQL } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { NotFoundError } from '@core/errors';
import { type PostSummaryOutcome } from '@contexts/library/domain';
import {
  type PostQuery,
  type PostQueryFindCriteria,
  type PostQueryResult,
  type PostQueryCursor,
  type PostQueryPaginateOptions,
  type PostQueryPaginateResult,
  type PostQueryPageItem,
  type PostQuerySeries,
  type PostQuerySeriesPost,
  type PostQuerySeriesWithPosts,
  type PostQuerySearchOptions,
  type PostQuerySearchResult,
  type PostQuerySearchCursor,
  type PostMatchReason,
  PostQuerySummary,
} from '@contexts/library/application/ports';
import { classifyPostgresError, DATABASE_TOKENS, sliceForCursor } from '@kernels/infrastructure';
import * as postsSchema from './schema';
import { PostSummaryPgDrizzleMapper } from './post-summary.pg-drizzle.mapper';

type QuerySchema = typeof postsSchema;

const TITLE_SEARCH_WEIGHT = 1;
const CONTENT_SEARCH_WEIGHT = TITLE_SEARCH_WEIGHT * 0.4;
const RRF_K = 60;
const CANDIDATE_POOL_SIZE = 50;
const EMBEDDING_MAX_DISTANCE = 0.6;
const PENDING_SUMMARY: PostQuerySummary = { kind: 'pending' };

type PostWithSourceRow = {
  post_id: string;
  title: string;
  view_count: number;
  created_at: Date;
  updated_at: Date;
  source_body: string;
  series: string | null;
  project: string | null;
};

type SeriesPositionRow = {
  post_id: string;
  name: string;
  position: number;
  total: number;
};

type SeriesPostRow = {
  post_id: string;
  title: string;
};

type PostListRow = {
  id: string;
  sourceId: string;
  title: string;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  project: string | null;
};

type SearchPostRow = {
  id: string;
  sourceId: string;
  title: string;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  searchScore: number;
  matchReason: PostMatchReason;
  embeddingDistance: number | null;
  content: string | null;
};

@Injectable()
export class PostPgDrizzleQuery implements PostQuery {
  constructor(
    @Inject(DATABASE_TOKENS.drizzleDatabase)
    private readonly db: NodePgDatabase<QuerySchema>,
  ) {}

  async get(criteria: PostQueryFindCriteria): Promise<PostQueryResult> {
    const result = await this.find(criteria);
    if (result === null) {
      throw new NotFoundError({
        code: 'post.not_found',
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
        SELECT p.id   AS post_id,
          s.title,
          p.view_count,
          p.created_at,
          p.updated_at,
          s.body        AS source_body,
          s.series,
          s.project
        FROM posts p
        INNER JOIN sources s ON p.id = s.id
        WHERE p.id = ${criteria.id}
        LIMIT 1
      `);
      rows = result.rows;
    } catch (error: unknown) {
      const ErrorClass = classifyPostgresError(error);
      throw new ErrorClass({
        code: 'post.get_with_source_failed',
        message: 'Post find query operation failed',
        details: { id: criteria.id },
        cause: error,
      });
    }

    const row = rows[0];
    if (row === undefined) {
      return null;
    }

    const [summaries, series] = await Promise.all([
      this.findSummaries([row.post_id]),
      row.series === null ? null : this.findSeriesWithPosts(row.series, row.post_id),
    ]);

    return {
      postId: row.post_id,
      sourceId: row.post_id,
      title: row.title,
      viewCount: row.view_count,
      summary: summaries.get(row.post_id) ?? PENDING_SUMMARY,
      series,
      project: row.project,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      body: row.source_body,
    };
  }

  async paginate({ limit, cursor, project }: PostQueryPaginateOptions): Promise<PostQueryPaginateResult> {
    try {
      const rows = await this.db
        .select({
          id: postsSchema.posts.id,
          sourceId: postsSchema.posts.id,
          title: sql<string>`s.title`,
          viewCount: postsSchema.posts.viewCount,
          createdAt: postsSchema.posts.createdAt,
          updatedAt: postsSchema.posts.updatedAt,
          project: sql<string | null>`s.project`,
        })
        .from(postsSchema.posts)
        .innerJoin(sql`sources s`, sql`${postsSchema.posts.id} = s.id`)
        .where(
          and(
            project === null ? undefined : sql`s.project = ${project}`,
            cursor === null ? undefined : lt(postsSchema.posts.id, cursor.id),
          ),
        )
        .orderBy(desc(postsSchema.posts.id))
        .limit(limit + 1);

      const { data, nextCursor } = sliceForCursor(rows, limit, (row) => ({
        id: row.id,
      }));
      const postIds = data.map((row) => row.id);
      const [summaries, series] = await Promise.all([this.findSummaries(postIds), this.findSeries(postIds)]);

      return this.toResult(data, nextCursor, summaries, series);
    } catch (error: unknown) {
      const ErrorClass = classifyPostgresError(error);
      throw new ErrorClass({
        code: 'post.paginate_failed',
        message: 'Post paginate operation failed',
        details: {},
        cause: error,
      });
    }
  }

  async count(): Promise<number> {
    try {
      const [row] = await this.db.select({ count: count() }).from(postsSchema.posts);
      return row?.count ?? 0;
    } catch (error: unknown) {
      const ErrorClass = classifyPostgresError(error);
      throw new ErrorClass({
        code: 'post.count_failed',
        message: 'Post count operation failed',
        details: {},
        cause: error,
      });
    }
  }

  // todo: 추후에 score 계산 서브쿼리 최적화 필요성 부하테스트 후 검증
  async search({ query, limit, cursor, queryEmbedding }: PostQuerySearchOptions): Promise<PostQuerySearchResult> {
    try {
      const result =
        queryEmbedding === null
          ? await this.searchByFts(query, limit, cursor)
          : await this.searchHybrid(query, queryEmbedding, limit, cursor);

      const rows = result.rows.map((row) => ({
        ...row,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      }));

      const { data, nextCursor } = sliceForCursor(rows, limit, (row) => ({
        id: row.id,
        score: row.searchScore,
      }));
      const summaries = await this.findSummaries(data.map((row) => row.id));

      return this.toSearchResult(data, nextCursor, query, summaries);
    } catch (error: unknown) {
      const ErrorClass = classifyPostgresError(error);
      throw new ErrorClass({
        code: 'post.search_failed',
        message: 'Post search operation failed',
        details: { query },
        cause: error,
      });
    }
  }

  private async searchByFts(query: string, limit: number, cursor: PostQuerySearchOptions['cursor']) {
    const tsQuery = sql`bigram_tsquery(${query})`;
    const score = this.ftsRelevanceScore(tsQuery);
    const matchWhere = this.ftsMatchCondition(tsQuery);

    const isFirstPage = cursor === null;
    const where = isFirstPage ? matchWhere : this.matchWhereAfterCursor(matchWhere, score, cursor);

    return this.db.execute<SearchPostRow>(sql`
      SELECT p.id  AS "id",
        p.id         AS "sourceId",
        s.title      AS "title",
        p.view_count AS "viewCount",
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        (${score})   AS "searchScore",
        'keyword'    AS "matchReason",
        NULL::double precision AS "embeddingDistance",
        s.body       AS "content"
      FROM posts p
      INNER JOIN sources s ON p.id = s.id
      WHERE ${where}
      ORDER BY "searchScore" DESC, p.id DESC
      LIMIT ${limit + 1}
    `);
  }

  private async searchHybrid(query: string, queryEmbedding: number[], limit: number, cursor: PostQuerySearchOptions['cursor']) {
    const tsQuery = sql`bigram_tsquery(${query})`;
    const embeddingLiteral = `[${queryEmbedding.join(',')}]`;

    const isFirstPage = cursor === null;
    const cursorWhere = isFirstPage ? sql`` : this.fusedCursorWhere(cursor);

    return this.db.execute<SearchPostRow>(sql`
      WITH fts_candidates AS (
        SELECT
          p.id,
          s.title,
          p.view_count, p.created_at, p.updated_at,
          s.body AS content,
          RANK() OVER (ORDER BY (${this.ftsRelevanceScore(tsQuery)}) DESC) AS fts_rank,
          (s.title_search_vector @@ ${tsQuery}) AS title_matched
        FROM posts p
        INNER JOIN sources s ON p.id = s.id
        WHERE ${this.ftsMatchCondition(tsQuery)}
        ORDER BY fts_rank
        LIMIT ${CANDIDATE_POOL_SIZE}
      ),
      embedding_candidates AS (
        SELECT
          p.id,
          s.title,
          p.view_count, p.created_at, p.updated_at,
          RANK() OVER (
            ORDER BY MIN(se.embedding <=> ${embeddingLiteral}::vector)
          ) AS embedding_rank,
          MIN(se.embedding <=> ${embeddingLiteral}::vector) AS embedding_distance
        FROM posts p
        INNER JOIN source_embeddings se ON se.source_id = p.id
        INNER JOIN sources s ON s.id = p.id
        WHERE (se.embedding <=> ${embeddingLiteral}::vector) < ${EMBEDDING_MAX_DISTANCE}
        GROUP BY p.id, s.title,
          p.view_count, p.created_at, p.updated_at
        ORDER BY embedding_rank
        LIMIT ${CANDIDATE_POOL_SIZE}
      ),
      fused AS (
        SELECT
          COALESCE(f.id, e.id)                 AS "id",
          COALESCE(f.id, e.id)                 AS "sourceId",
          COALESCE(f.title, e.title)           AS "title",
          COALESCE(f.view_count, e.view_count) AS "viewCount",
          COALESCE(f.created_at, e.created_at) AS "createdAt",
          COALESCE(f.updated_at, e.updated_at) AS "updatedAt",
          (${this.rrfFusionScore()})            AS "searchScore",
          (${this.matchReasonCase()})           AS "matchReason",
          e.embedding_distance                 AS "embeddingDistance",
          f.content                            AS "content"
        FROM fts_candidates f
        FULL OUTER JOIN embedding_candidates e ON f.id = e.id
      )
      SELECT * FROM fused
      ${cursorWhere}
      ORDER BY "searchScore" DESC, "id" DESC
      LIMIT ${limit + 1}
    `);
  }

  private ftsRelevanceScore(tsQuery: SQL): SQL {
    const titleMatchScore = sql`ts_rank(s.title_search_vector, ${tsQuery}, 2) * ${TITLE_SEARCH_WEIGHT}`;
    const contentMatchScore = sql`ts_rank(s.body_search_vector, ${tsQuery}, 2) * ${CONTENT_SEARCH_WEIGHT}`;
    return sql`${titleMatchScore} + ${contentMatchScore}`;
  }

  private rrfFusionScore(): SQL {
    return sql`(
      COALESCE(1.0 / (${RRF_K} + f.fts_rank), 0)
      + COALESCE(1.0 / (${RRF_K} + e.embedding_rank), 0)
      + CASE WHEN f.title_matched THEN COALESCE(1.0 / (${RRF_K} + f.fts_rank), 0) ELSE 0 END
    )::double precision`;
  }

  private matchReasonCase(): SQL {
    return sql`CASE
      WHEN f.id IS NOT NULL AND e.id IS NOT NULL THEN 'both'
      WHEN f.id IS NOT NULL THEN 'keyword'
      ELSE 'semantic'
    END`;
  }

  private ftsMatchCondition(tsQuery: SQL): SQL {
    return sql`(
      s.title_search_vector @@ ${tsQuery}
      OR s.body_search_vector @@ ${tsQuery}
    )`;
  }

  private keysetTieBreak(scoreExpr: SQL, idExpr: SQL, cursor: { score: number; id: string }): SQL {
    return sql`(
      (${scoreExpr}) < ${cursor.score}
      OR ((${scoreExpr}) = ${cursor.score} AND (${idExpr}) < ${cursor.id})
    )`;
  }

  private matchWhereAfterCursor(matchWhere: SQL, scoreExpr: SQL, cursor: { score: number; id: string }): SQL {
    return sql`${matchWhere} AND ${this.keysetTieBreak(scoreExpr, sql`p.id`, cursor)}`;
  }

  private fusedCursorWhere(cursor: { score: number; id: string }): SQL {
    return sql`WHERE ${this.keysetTieBreak(sql`"searchScore"`, sql`"id"`, cursor)}`;
  }

  private toResult<TCursor extends PostQueryCursor>(
    data: PostListRow[],
    nextCursor: TCursor | null,
    summaries: Map<string, PostSummaryOutcome>,
    series: Map<string, PostQuerySeries>,
  ): { posts: PostQueryPageItem[]; nextCursor: TCursor | null } {
    return {
      posts: data.map((row): PostQueryPageItem => ({
        postId: row.id,
        sourceId: row.sourceId,
        title: row.title,
        viewCount: row.viewCount,
        summary: summaries.get(row.id) ?? PENDING_SUMMARY,
        series: series.get(row.id) ?? null,
        project: row.project,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      nextCursor,
    };
  }

  private toSearchResult(
    data: SearchPostRow[],
    nextCursor: PostQuerySearchCursor | null,
    query: string,
    summaries: Map<string, PostSummaryOutcome>,
  ): PostQuerySearchResult {
    return {
      posts: data.map((row) => ({
        postId: row.id,
        sourceId: row.sourceId,
        title: row.title,
        viewCount: row.viewCount,
        summary: summaries.get(row.id) ?? PENDING_SUMMARY,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        matchReason: row.matchReason,
        similarity: this.toSimilarityPercent(row.embeddingDistance),
        snippet: row.content === null ? null : this.toSnippet(row.content, query),
      })),
      nextCursor,
    };
  }

  private async findSummaries(postIds: readonly string[]): Promise<Map<string, PostSummaryOutcome>> {
    if (postIds.length === 0) return new Map();

    const rows = await this.db
      .select()
      .from(postsSchema.postSummaries)
      .where(inArray(postsSchema.postSummaries.postId, [...postIds]));

    return new Map(rows.map((row) => [row.postId, PostSummaryPgDrizzleMapper.toOutcome(row)]));
  }

  private async findSeries(postIds: readonly string[]): Promise<Map<string, PostQuerySeries>> {
    if (postIds.length === 0) return new Map();

    const ids = sql.join(
      postIds.map((id) => sql`${id}`),
      sql`, `,
    );
    const result = await this.db.execute<SeriesPositionRow>(sql`
      SELECT ranked.post_id, ranked.name, ranked.position, ranked.total
      FROM (
        SELECT p.id AS post_id,
          s.series AS name,
          ROW_NUMBER() OVER (PARTITION BY s.series ORDER BY s.series_order, p.created_at, p.id)::int AS position,
          COUNT(*) OVER (PARTITION BY s.series)::int AS total
        FROM posts p
        INNER JOIN sources s ON p.id = s.id
        WHERE s.series IN (SELECT series FROM sources WHERE id IN (${ids}) AND series IS NOT NULL)
      ) ranked
      WHERE ranked.post_id IN (${ids})
    `);

    return new Map(result.rows.map((row) => [row.post_id, { name: row.name, position: row.position, total: row.total }]));
  }

  private async findSeriesWithPosts(name: string, postId: string): Promise<PostQuerySeriesWithPosts> {
    const result = await this.db.execute<SeriesPostRow>(sql`
      SELECT p.id AS post_id, s.title
      FROM posts p
      INNER JOIN sources s ON p.id = s.id
      WHERE s.series = ${name}
      ORDER BY s.series_order, p.created_at, p.id
    `);
    const posts: PostQuerySeriesPost[] = result.rows.map((row) => ({ postId: row.post_id, title: row.title }));

    return {
      name,
      position: posts.findIndex((post) => post.postId === postId) + 1,
      total: posts.length,
      posts,
    };
  }

  private toSimilarityPercent(embeddingDistance: number | null): number | null {
    return embeddingDistance === null ? null : Math.round((1 - embeddingDistance) * 100);
  }

  private toSnippet(content: string, query: string): string | null {
    const index = content.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) {
      return null;
    }

    const start = Math.max(0, index - 40);
    const end = Math.min(content.length, index + query.length + 40);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < content.length ? '...' : '';

    return `${prefix}${content.slice(start, end).trim()}${suffix}`;
  }
}
