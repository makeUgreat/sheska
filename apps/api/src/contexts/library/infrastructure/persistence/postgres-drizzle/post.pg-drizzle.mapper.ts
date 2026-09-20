import { Post } from '@contexts/library/domain';
import { type PostInsert, type PostRow } from './schema';

export class PostPgDrizzleMapper {
  static toDomain(this: void, row: PostRow): Post {
    return Post.restore({
      id: row.id,
      viewCount: row.viewCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toInsert(post: Post): PostInsert {
    const props = post.getProps();

    return {
      id: post.id,
      viewCount: props.viewCount.unpack(),
    };
  }
}
