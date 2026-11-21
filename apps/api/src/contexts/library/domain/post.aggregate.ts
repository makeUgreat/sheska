import { AggregateRoot } from '@kernels/domain';
import { type PostDomainEvent, PostPublishedDomainEvent } from './post.event';
import { PostViewCount } from './post-view-count.vo';

interface PostProps {
  viewCount: PostViewCount;
}

export class Post extends AggregateRoot<PostProps, PostDomainEvent> {
  // Post는 Source와 1:1이므로 식별자를 공유한다.
  get sourceId(): string {
    return this.id;
  }

  static create(params: PostCreateParams): Post {
    const post = new Post({
      id: params.sourceId,
      props: {
        viewCount: PostViewCount.of(0),
      },
    });

    post.addEvent(new PostPublishedDomainEvent({ aggregateId: post.id }));

    return post;
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

interface PostCreateParams {
  sourceId: string;
}

interface PostRestoreParams {
  id: string;
  viewCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}
