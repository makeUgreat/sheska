import { type Post } from './post.aggregate';

export type PostRepositoryGetCriteria = {
  readonly id: string;
};

export interface PostRepository {
  get(criteria: PostRepositoryGetCriteria): Promise<Post | null>;
  findBySourceId(sourceId: string): Promise<Post | null>;
  list(): Promise<Post[]>;
  save(post: Post): Promise<Post>;
}
