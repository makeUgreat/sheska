export interface EmbeddingMetadata {
  readonly model: string;
  readonly dimensions: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SourceEmbeddingLookup {
  find(criteria: { sourceId: string }): Promise<EmbeddingMetadata | null>;
}
