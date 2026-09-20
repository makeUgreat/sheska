import { Inject, Injectable } from '@nestjs/common';
import { type PostQuery } from '@contexts/library/application/ports';
import { POST_QUERY } from '@contexts/library/library.di-tokens';

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
