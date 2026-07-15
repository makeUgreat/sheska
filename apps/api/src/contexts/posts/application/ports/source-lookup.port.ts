export interface SourceInfo {
  readonly content: string;
  readonly externalSourceId: string;
}

export interface SourceLookup {
  find(sourceId: string): Promise<SourceInfo | null>;
}
