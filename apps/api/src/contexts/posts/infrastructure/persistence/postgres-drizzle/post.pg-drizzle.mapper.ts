import { Post } from '@contexts/posts/domain';
import { type PostInsert, type PostRow } from './schema';

export class PostPgDrizzleMapper {
  static toDomain(this: void, row: PostRow): Post {
    return Post.restore({
      id: row.id,
      sourceId: row.sourceId,
      title: row.title,
      viewCount: row.viewCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toInsert(post: Post): PostInsert {
    const props = post.getProps();

    return {
      id: post.id,
      sourceId: props.sourceId,
      title: props.title.unpack(),
      viewCount: props.viewCount.unpack(),
    };
  }
}
