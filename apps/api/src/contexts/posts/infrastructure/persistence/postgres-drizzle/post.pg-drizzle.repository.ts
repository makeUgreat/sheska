import { desc, eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  type Post,
  type PostRepository,
  type PostRepositoryGetCriteria,
} from '@contexts/posts/domain';
import {
  classifyPostgresError,
  InfrastructureException,
} from '@kernels/infrastructure';
import * as schema from './schema';
import { PostPgDrizzleMapper } from './post.pg-drizzle.mapper';

const ADAPTER = 'post.pg-drizzle';

export class PostPgDrizzleRepository implements PostRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async get(criteria: PostRepositoryGetCriteria): Promise<Post | null> {
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
        details: {},
        cause: error,
      });
    }

    if (row === undefined) {
      return null;
    }

    return PostPgDrizzleMapper.toDomain(row);
  }

  async findBySourceId(sourceId: string): Promise<Post | null> {
    let row: schema.PostRow | undefined;

    try {
      [row] = await this.db
        .select()
        .from(schema.posts)
        .where(eq(schema.posts.sourceId, sourceId))
        .limit(1);
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'post.find_by_source_id_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Post findBySourceId operation failed',
        details: {},
        cause: error,
      });
    }

    if (row === undefined) {
      return null;
    }

    return PostPgDrizzleMapper.toDomain(row);
  }

  async list(): Promise<Post[]> {
    let rows: schema.PostRow[];

    try {
      rows = await this.db
        .select()
        .from(schema.posts)
        .orderBy(desc(schema.posts.createdAt));
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

    return rows.map((row) => PostPgDrizzleMapper.toDomain(row));
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
        details: {},
        cause: error,
      });
    }

    return PostPgDrizzleMapper.toDomain(row);
  }
}
