import { ValueObject } from '@kernels/domain';
import { type PostViewClient } from './post-view-client.vo';

const COOLDOWN_MS = 30 * 60 * 1000;

interface PostViewProps {
  postId: string;
  ip: string;
  client: PostViewClient;
  viewedAt: Date;
}

export class PostView extends ValueObject<PostViewProps> {
  private constructor(props: PostViewProps) {
    super(props);
  }

  static of(props: PostViewProps): PostView {
    return new PostView(props);
  }

  countsAfter(previous: PostView | null): boolean {
    if (previous === null) return true;

    return this.props.viewedAt.getTime() - previous.props.viewedAt.getTime() >= COOLDOWN_MS;
  }

  protected validate(): void {}
}
