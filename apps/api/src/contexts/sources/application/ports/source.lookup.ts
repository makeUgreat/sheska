export interface SourceDocument {
  readonly content: string;
  readonly externalSourceId: string;
}

export interface SourceLookup {
  get(sourceId: string): Promise<SourceDocument>;
  find(sourceId: string): Promise<SourceDocument | null>;
}
