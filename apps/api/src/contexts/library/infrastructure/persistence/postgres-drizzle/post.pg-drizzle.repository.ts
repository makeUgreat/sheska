import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  type Post,
  type PostRepository,
  type PostRepositoryGetCriteria,
} from '@contexts/library/domain';
import {
  classifyPostgresError,
  DATABASE_TOKENS,
  INFRASTRUCTURE_ERROR_KIND,
  InfrastructureException,
} from '@kernels/infrastructure';
import * as schema from './schema';
import { PostPgDrizzleMapper } from './post.pg-drizzle.mapper';

const ADAPTER = 'post.pg-drizzle';

@Injectable()
export class PostPgDrizzleRepository implements PostRepository {
  constructor(
    @Inject(DATABASE_TOKENS.drizzleDatabase)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

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
        kind: INFRASTRUCTURE_ERROR_KIND.NOT_FOUND,
        code: 'post.not_found',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Post not found',
        details: { id: criteria.id },
      });
    }

    return PostPgDrizzleMapper.toDomain(row);
  }

  async insert(post: Post): Promise<Post> {
    const postInsert = PostPgDrizzleMapper.toInsert(post);
    let row: schema.PostRow;

    try {
      [row] = await this.db.insert(schema.posts).values(postInsert).returning();
    } catch (error: unknown) {
      const kind = classifyPostgresError(error);
      if (kind === INFRASTRUCTURE_ERROR_KIND.CONSTRAINT_VIOLATION) {
        throw new InfrastructureException({
          kind,
          code: 'post.already_exists',
          source: { boundary: 'persistence', adapter: ADAPTER },
          message: 'A post for this source already exists',
          details: { id: postInsert.id },
        });
      }

      throw new InfrastructureException({
        kind,
        code: 'post.insert_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Post insert operation failed',
        details: { id: postInsert.id },
        cause: error,
      });
    }

    return PostPgDrizzleMapper.toDomain(row);
  }

  async update(post: Post): Promise<Post> {
    const postInsert = PostPgDrizzleMapper.toInsert(post);
    let row: schema.PostRow | undefined;

    try {
      [row] = await this.db
        .update(schema.posts)
        .set({ viewCount: postInsert.viewCount, updatedAt: new Date() })
        .where(eq(schema.posts.id, postInsert.id))
        .returning();
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'post.update_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Post update operation failed',
        details: { id: postInsert.id },
        cause: error,
      });
    }

    if (row === undefined) {
      throw new InfrastructureException({
        kind: INFRASTRUCTURE_ERROR_KIND.NOT_FOUND,
        code: 'post.not_found',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Post not found',
        details: { id: postInsert.id },
      });
    }

    return PostPgDrizzleMapper.toDomain(row);
  }
}
