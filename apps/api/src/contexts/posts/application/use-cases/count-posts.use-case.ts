import { Inject, Injectable } from '@nestjs/common';
import { type PostQuery } from '@contexts/posts/application/ports';
import { POST_QUERY } from '@contexts/posts/posts.di-tokens';

@Injectable()
export class CountPostsUseCase {
  constructor(
    @Inject(POST_QUERY)
    private readonly postQuery: PostQuery,
  ) {}

  async execute(): Promise<number> {
    return this.postQuery.count();
  }
}
