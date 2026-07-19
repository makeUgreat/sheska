import { Inject, Injectable } from '@nestjs/common';
import { type PostRepository } from '@contexts/posts/domain';
import { POST_REPOSITORY } from '@contexts/posts/posts.di-tokens';
import { type ListPostsResult } from './list-posts.use-case';

export type SearchPostsCommand = {
  readonly query: string;
};

@Injectable()
export class SearchPostsUseCase {
  constructor(
    @Inject(POST_REPOSITORY)
    private readonly posts: PostRepository,
  ) {}

  async execute(command: SearchPostsCommand): Promise<ListPostsResult> {
    const posts = await this.posts.list({ query: command.query });

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
