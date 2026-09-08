export interface PublishableSourceContent {
  readonly content: string;
  readonly externalSourceId: string;
}

export interface SourceLookup {
  get(sourceId: string): Promise<PublishableSourceContent>;
  find(sourceId: string): Promise<PublishableSourceContent | null>;
}
