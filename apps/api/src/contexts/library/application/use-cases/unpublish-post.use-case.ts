import { Inject, Injectable } from '@nestjs/common';
import { type PostRepository } from '@contexts/library/domain';
import { POST_REPOSITORY } from '@contexts/library/library.di-tokens';

export interface UnpublishPostCommand {
  readonly postId: string;
}

@Injectable()
export class UnpublishPostUseCase {
  constructor(
    @Inject(POST_REPOSITORY)
    private readonly posts: PostRepository,
  ) {}

  async execute(command: UnpublishPostCommand): Promise<void> {
    await this.posts.delete({ id: command.postId });
  }
}
