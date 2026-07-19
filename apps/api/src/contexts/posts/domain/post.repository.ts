import { type Post } from './post.aggregate';

export type PostRepositoryGetCriteria = {
  readonly id: string;
};

export type PostRepositoryFindCriteria = {
  readonly sourceId: string;
};

export type PostRepositoryListCriteria = {
  readonly query?: string;
};

export interface PostRepository {
  get(criteria: PostRepositoryGetCriteria): Promise<Post>;
  find(criteria: PostRepositoryFindCriteria): Promise<Post | null>;
  list(criteria?: PostRepositoryListCriteria): Promise<Post[]>;
  save(post: Post): Promise<Post>;
}
