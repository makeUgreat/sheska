import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PostView, PostViewClient, type PostViewRepository, type PostViewRepositoryFindCriteria } from '@contexts/library/domain';
import { classifyPostgresError, DATABASE_TOKENS } from '@kernels/infrastructure';
import * as schema from './schema';

@Injectable()
export class PostViewPgDrizzleRepository implements PostViewRepository {
  constructor(
    @Inject(DATABASE_TOKENS.drizzleDatabase)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findLatest(criteria: PostViewRepositoryFindCriteria): Promise<PostView | null> {
    let row: schema.PostViewRow | undefined;

    try {
      [row] = await this.db
        .select()
        .from(schema.postViews)
        .where(and(eq(schema.postViews.postId, criteria.postId), eq(schema.postViews.ip, criteria.ip)))
        .orderBy(desc(schema.postViews.viewedAt))
        .limit(1);
    } catch (error: unknown) {
      const ErrorClass = classifyPostgresError(error);
      throw new ErrorClass({
        code: 'post.find_latest_view_failed',
        message: 'Post view find operation failed',
        details: { id: criteria.postId },
        cause: error,
      });
    }

    if (row === undefined) return null;

    return PostView.of({
      postId: row.postId,
      ip: row.ip,
      client: PostViewClient.of(row.client),
      viewedAt: row.viewedAt,
    });
  }

  async insert(view: PostView): Promise<void> {
    const props = view.unpack();

    try {
      await this.db.insert(schema.postViews).values({ ...props, client: props.client.unpack() });
    } catch (error: unknown) {
      const ErrorClass = classifyPostgresError(error);
      throw new ErrorClass({
        code: 'post.insert_view_failed',
        message: 'Post view insert operation failed',
        details: { id: props.postId },
        cause: error,
      });
    }
  }
}
