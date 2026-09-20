import { AggregateRoot, newId } from '@kernels/domain';
import { PostViewCount } from './post-view-count.vo';

interface PostProps {
  sourceId: string;
  viewCount: PostViewCount;
}

interface PostCreateParams {
  sourceId: string;
}

interface PostRestoreParams {
  id: string;
  sourceId: string;
  viewCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Post extends AggregateRoot<PostProps> {
  static create(params: PostCreateParams): Post {
    return new Post({
      id: newId(),
      props: {
        sourceId: params.sourceId,
        viewCount: PostViewCount.of(0),
      },
    });
  }

  static restore(params: PostRestoreParams): Post {
    return new Post({
      id: params.id,
      props: {
        sourceId: params.sourceId,
        viewCount: PostViewCount.of(params.viewCount),
      },
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    });
  }

  incrementViewCount(): void {
    this.props.viewCount = this.props.viewCount.increment();
  }

  public validate(): void {}
}
