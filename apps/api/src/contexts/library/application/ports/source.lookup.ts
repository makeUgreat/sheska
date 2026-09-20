export interface SourceDocument {
  readonly externalSourceId: string;
  readonly title: string;
  readonly body: string;
}

export interface SourceLookup {
  get(sourceId: string): Promise<SourceDocument>;
  find(sourceId: string): Promise<SourceDocument | null>;
}
