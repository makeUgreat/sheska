import { Result as ResultUtils, ok, type Result } from '@core/result';
import { AggregateRoot, type EntityParams } from '@kernels/domain';
import { type PostDomainError } from './post.error';
import { PostContent } from './post-content';
import { PostTitle } from './post-title';

export type PostId = string;

export interface PostRestoreParams {
  id: PostId;
  title: string;
  content: string;
}

export interface PostProps {
  title: PostTitle;
  content: PostContent;
}

export class Post extends AggregateRoot<PostId, PostProps> {
  private constructor(params: EntityParams<PostId, PostProps>) {
    super(params);
  }

  static restore(params: PostRestoreParams): Result<Post, PostDomainError> {
    const { id, title, content } = params;

    return ResultUtils.combine([
      PostTitle.of(title),
      PostContent.of(content),
    ]).andThen(([title, content]) =>
      Post.construct({
        params: {
          id,
          props: {
            title,
            content,
          },
        },
        validate: (entityParams) => ok(entityParams),
      }),
    );
  }
}
