import { all, err, ok, type Result } from '@core/result';
import {
  AggregateRoot,
  DOMAIN_ERROR_KIND,
  type DomainError,
  type EntityParams,
} from '@kernels/domain';
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
  static restore(params: PostRestoreParams): Result<Post, DomainError> {
    return all({
      title: PostTitle.of(params.title),
      content: PostContent.of(params.content),
    }).andThen(({ title, content }) =>
      super.construct({
        params: {
          id: params.id.trim(),
          props: {
            title,
            content,
          },
        },
        validate: (entityParams) => Post.validateParams(entityParams),
        instantiate: (entityParams) => new Post(entityParams),
      }),
    );
  }

  private constructor(params: EntityParams<PostId, PostProps>) {
    super(params);
  }

  private static validateParams(
    params: EntityParams<PostId, PostProps>,
  ): Result<EntityParams<PostId, PostProps>, DomainError> {
    if (params.id.length === 0) {
      return err({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'post.id_empty',
        message: 'Post id cannot be empty',
        details: { fields: ['id'] },
      });
    }

    return ok(params);
  }
}
