export interface SourceInfo {
  readonly content: string;
  readonly externalSourceId: string;
}

export interface SourceLookup {
  get(sourceId: string): Promise<SourceInfo>;
  find(sourceId: string): Promise<SourceInfo | null>;
}
