export interface SyncJobProgress {
  readonly totalChunks: number;
  readonly processedChunks: number;
}

export interface SyncJobProgressLookup {
  find(criteria: { syncJobId: string }): Promise<SyncJobProgress | null>;
}
