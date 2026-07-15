import { Inject, Injectable } from '@nestjs/common';
import { type PostRepository } from '@contexts/posts/domain';
import { POST_REPOSITORY } from '@contexts/posts/posts.di-tokens';

export interface ListPostsResult {
  readonly posts: ReadonlyArray<{
    readonly postId: string;
    readonly sourceId: string;
    readonly title: string;
    readonly viewCount: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
  }>;
}

@Injectable()
export class ListPostsUseCase {
  constructor(
    @Inject(POST_REPOSITORY)
    private readonly posts: PostRepository,
  ) {}

  async execute(): Promise<ListPostsResult> {
    const posts = await this.posts.list();

    return {
      posts: posts.map((post) => {
        const props = post.getProps();
        return {
          postId: post.id,
          sourceId: props.sourceId,
          title: props.title.unpack(),
          viewCount: props.viewCount.unpack(),
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        };
      }),
    };
  }
}
