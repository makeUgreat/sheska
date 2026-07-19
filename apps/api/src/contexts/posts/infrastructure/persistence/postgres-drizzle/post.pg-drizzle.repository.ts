import { and, desc, eq, lt, or, sql } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  type Post,
  type PostRepository,
  type PostRepositoryCursor,
  type PostRepositoryFindCriteria,
  type PostRepositoryGetCriteria,
  type PostRepositoryListOptions,
  type PostRepositoryListResult,
} from '@contexts/posts/domain';
import {
  classifyPostgresError,
  InfrastructureException,
} from '@kernels/infrastructure';
import * as schema from './schema';
import { PostPgDrizzleMapper } from './post.pg-drizzle.mapper';

const ADAPTER = 'post.pg-drizzle';

type SearchPostRow = schema.PostRow & {
  searchScore: number;
};

export class PostPgDrizzleRepository implements PostRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async get(criteria: PostRepositoryGetCriteria): Promise<Post> {
    let row: schema.PostRow | undefined;

    try {
      [row] = await this.db
        .select()
        .from(schema.posts)
        .where(eq(schema.posts.id, criteria.id))
        .limit(1);
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'post.get_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Post get operation failed',
        details: { id: criteria.id },
        cause: error,
      });
    }

    if (row === undefined) {
      throw new InfrastructureException({
        kind: 'not_found',
        code: 'post.get_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Post not found',
        details: { id: criteria.id },
      });
    }

    return PostPgDrizzleMapper.toDomain(row);
  }

  async find(criteria: PostRepositoryFindCriteria): Promise<Post | null> {
    let row: schema.PostRow | undefined;

    try {
      [row] = await this.db
        .select()
        .from(schema.posts)
        .where(eq(schema.posts.sourceId, criteria.sourceId))
        .limit(1);
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'post.find_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Post find operation failed',
        details: { sourceId: criteria.sourceId },
        cause: error,
      });
    }

    if (row === undefined) {
      return null;
    }

    return PostPgDrizzleMapper.toDomain(row);
  }

  // TODO: Add composite indexes for cursor predicates and verify with
  // EXPLAIN ANALYZE whether these queries use index scans.
  async list(
    options?: PostRepositoryListOptions,
  ): Promise<PostRepositoryListResult> {
    const limit = options?.limit ?? 20;

    try {
      if (options?.query !== undefined) {
        return this.searchList(options, limit);
      }

      return this.defaultList(options, limit);
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'post.list_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Post list operation failed',
        details: {},
        cause: error,
      });
    }
  }

  async save(post: Post): Promise<Post> {
    const postInsert = PostPgDrizzleMapper.toInsert(post);
    let row: schema.PostRow;

    try {
      [row] = await this.db
        .insert(schema.posts)
        .values(postInsert)
        .onConflictDoUpdate({
          target: schema.posts.id,
          set: {
            title: postInsert.title,
            viewCount: postInsert.viewCount,
            updatedAt: new Date(),
          },
        })
        .returning();
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'post.save_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Post save operation failed',
        details: { id: postInsert.id },
        cause: error,
      });
    }

    return PostPgDrizzleMapper.toDomain(row);
  }

  private async defaultList(
    options: PostRepositoryListOptions | undefined,
    limit: number,
  ): Promise<PostRepositoryListResult> {
    const baseQuery = this.db
      .select()
      .from(schema.posts)
      .orderBy(desc(schema.posts.createdAt), desc(schema.posts.id))
      .limit(limit + 1);

    const rows = options?.cursor
      ? await baseQuery.where(
          or(
            lt(schema.posts.createdAt, options.cursor.createdAt),
            and(
              eq(schema.posts.createdAt, options.cursor.createdAt),
              lt(schema.posts.id, options.cursor.id),
            ),
          ),
        )
      : await baseQuery;

    return this.toListResult(rows, limit);
  }

  private async searchList(
    options: PostRepositoryListOptions,
    limit: number,
  ): Promise<PostRepositoryListResult> {
    const score = sql<number>`
      CASE
        WHEN lower(${schema.posts.title}) = lower(${options.query}) THEN 1
        ELSE 0
      END + GREATEST(
        similarity(${schema.posts.title}, ${options.query}),
        word_similarity(${options.query}, ${schema.posts.title})
      )
    `;
    const cursorScore = options.cursor?.score;
    const searchWhere = sql`
      ${schema.posts.title} % ${options.query}
      OR ${options.query} <% ${schema.posts.title}
    `;
    const cursorWhere =
      options.cursor && cursorScore !== undefined
        ? or(
            sql`${score} < ${cursorScore}`,
            and(
              sql`${score} = ${cursorScore}`,
              or(
                lt(schema.posts.createdAt, options.cursor.createdAt),
                and(
                  eq(schema.posts.createdAt, options.cursor.createdAt),
                  lt(schema.posts.id, options.cursor.id),
                ),
              ),
            ),
          )
        : undefined;

    const rows = await this.db
      .select({
        id: schema.posts.id,
        sourceId: schema.posts.sourceId,
        title: schema.posts.title,
        viewCount: schema.posts.viewCount,
        createdAt: schema.posts.createdAt,
        updatedAt: schema.posts.updatedAt,
        searchScore: score,
      })
      .from(schema.posts)
      .where(cursorWhere ? and(searchWhere, cursorWhere) : searchWhere)
      .orderBy(desc(score), desc(schema.posts.createdAt), desc(schema.posts.id))
      .limit(limit + 1);

    return this.toListResult(rows, limit);
  }

  private toListResult(
    rows: Array<schema.PostRow | SearchPostRow>,
    limit: number,
  ): PostRepositoryListResult {
    const hasNext = rows.length > limit;
    const data = hasNext ? rows.slice(0, limit) : rows;
    const lastRow = data[data.length - 1];
    const nextCursor: PostRepositoryCursor | null =
      hasNext && lastRow
        ? {
            createdAt: lastRow.createdAt,
            id: lastRow.id,
            ...('searchScore' in lastRow ? { score: lastRow.searchScore } : {}),
          }
        : null;

    return {
      posts: data.map((row) => PostPgDrizzleMapper.toDomain(row)),
      nextCursor,
    };
  }
}
