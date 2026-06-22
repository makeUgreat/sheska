import { all, ok, type Result } from '@core/result';
import {
  AggregateRoot,
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
          id: params.id,
          props: {
            title,
            content,
          },
        },
        validate: (entityParams) => ok(entityParams),
        instantiate: (entityParams) => new Post(entityParams),
      }),
    );
  }

  private constructor(params: EntityParams<PostId, PostProps>) {
    super(params);
  }
}
