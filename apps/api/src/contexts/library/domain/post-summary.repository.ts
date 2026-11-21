import { type PostSummary } from './post-summary.aggregate';

export type PostSummaryRepositoryFindCriteria = {
  readonly postId: string;
};

export interface PostSummaryRepository {
  find(criteria: PostSummaryRepositoryFindCriteria): Promise<PostSummary | null>;
  upsert(summary: PostSummary): Promise<PostSummary>;
}
