export interface PublishableSource {
  readonly title: string;
}

export interface SourceLookup {
  get(sourceId: string): Promise<PublishableSource>;
  find(sourceId: string): Promise<PublishableSource | null>;
}
