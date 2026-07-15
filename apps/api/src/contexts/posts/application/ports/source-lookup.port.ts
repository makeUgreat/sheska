export interface SourceLookup {
  exists(sourceId: string): Promise<boolean>;
}
