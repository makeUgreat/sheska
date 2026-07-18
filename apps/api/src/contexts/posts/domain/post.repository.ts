import { type Post } from './post.aggregate';

export type PostRepositoryGetCriteria = {
  readonly id: string;
};

export type PostRepositoryFindCriteria = {
  readonly sourceId: string;
};

export type PostRepositoryCursor = {
  readonly createdAt: Date;
  readonly id: string;
};

export type PostRepositoryListOptions = {
  readonly limit: number;
  readonly cursor?: PostRepositoryCursor;
};

export type PostRepositoryListResult = {
  readonly posts: Post[];
  readonly nextCursor: PostRepositoryCursor | null;
};

export interface PostRepository {
  get(criteria: PostRepositoryGetCriteria): Promise<Post>;
  find(criteria: PostRepositoryFindCriteria): Promise<Post | null>;
  list(options?: PostRepositoryListOptions): Promise<PostRepositoryListResult>;
  save(post: Post): Promise<Post>;
}
