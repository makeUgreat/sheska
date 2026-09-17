export const SOURCE_EMBEDDING_CHUNK_QUEUE = 'source-embedding-chunk';
export const SOURCE_EMBEDDING_FINALIZATION_QUEUE =
  'source-embedding-finalization';
export const SOURCE_EMBEDDING_FLOW_PRODUCER = 'source-embedding-workflow';

export interface EmbeddingWorkflowChunk {
  readonly chunkIndex: number;
  readonly chunkContent: string;
}

export interface EmbeddingWorkflowPayload {
  readonly sourceId: string;
  readonly syncJobId: string;
  readonly chunks: readonly EmbeddingWorkflowChunk[];
}

export interface EmbeddingWorkflowDispatcher {
  dispatch(payload: EmbeddingWorkflowPayload): Promise<void>;
}
