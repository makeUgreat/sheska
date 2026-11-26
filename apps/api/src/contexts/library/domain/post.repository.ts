import { type Post } from './post.aggregate';

export type PostRepositoryGetCriteria = {
  readonly id: string;
};

export type PostRepositoryDeleteCriteria = {
  readonly id: string;
};

export interface PostRepository {
  get(criteria: PostRepositoryGetCriteria): Promise<Post>;
  insert(post: Post): Promise<Post>;
  update(post: Post): Promise<Post>;
  delete(criteria: PostRepositoryDeleteCriteria): Promise<void>;
}
