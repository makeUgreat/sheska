import { type PostView } from './post-view.vo';

export type PostViewRepositoryFindCriteria = {
  readonly postId: string;
  readonly ip: string;
};

export interface PostViewRepository {
  findLatest(criteria: PostViewRepositoryFindCriteria): Promise<PostView | null>;
  insert(view: PostView): Promise<void>;
}
