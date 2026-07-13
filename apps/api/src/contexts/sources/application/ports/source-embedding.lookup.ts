export interface EmbeddingInfo {
  readonly model: string;
  readonly dimensions: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SourceEmbeddingLookup {
  findBySourceId(criteria: { sourceId: string }): Promise<EmbeddingInfo | null>;
}
