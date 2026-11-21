export const POST_SUMMARY_QUEUE = 'post-summary';

export interface PostSummaryJob {
  readonly postId: string;
  readonly fingerprint: string;
}

export interface PostSummaryJobDispatcher {
  dispatch(job: PostSummaryJob): Promise<void>;
}
