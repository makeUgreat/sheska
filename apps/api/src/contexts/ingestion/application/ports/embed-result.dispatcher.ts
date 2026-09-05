export const EMBED_RESULTS_QUEUE = 'embed-results';

export interface EmbedResultChunk {
  readonly chunkIndex: number;
  readonly chunkContent: string;
  readonly embedding: number[];
}

export interface EmbedResultPayload {
  readonly sourceId: string;
  readonly syncJobId: string;
  readonly model: string;
  readonly chunks: EmbedResultChunk[];
}

export interface EmbedResultDispatcher {
  enqueue(payload: EmbedResultPayload): Promise<void>;
}
