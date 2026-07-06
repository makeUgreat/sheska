export interface EmbedJob {
  readonly sourceId: string;
  readonly syncJobId: string;
  readonly content: string;
}

export interface EmbedJobDispatcher {
  dispatch(job: EmbedJob): Promise<void>;
}
