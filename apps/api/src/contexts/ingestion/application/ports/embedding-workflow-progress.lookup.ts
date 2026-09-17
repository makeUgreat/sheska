export interface EmbeddingWorkflowProgress {
  readonly totalChunks: number;
  readonly processedChunks: number;
}

export interface EmbeddingWorkflowProgressLookup {
  find(criteria: {
    syncJobId: string;
  }): Promise<EmbeddingWorkflowProgress | null>;
}
