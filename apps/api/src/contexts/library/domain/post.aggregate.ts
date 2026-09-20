import { AggregateRoot } from '@kernels/domain';
import { PostViewCount } from './post-view-count.vo';

interface PostProps {
  viewCount: PostViewCount;
}

interface PostCreateParams {
  sourceId: string;
}

interface PostRestoreParams {
  id: string;
  viewCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Post extends AggregateRoot<PostProps> {
  // Post는 Source와 1:1이므로 식별자를 공유한다.
  get sourceId(): string {
    return this.id;
  }

  static create(params: PostCreateParams): Post {
    return new Post({
      id: params.sourceId,
      props: {
        viewCount: PostViewCount.of(0),
      },
    });
  }

  static restore(params: PostRestoreParams): Post {
    return new Post({
      id: params.id,
      props: {
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
