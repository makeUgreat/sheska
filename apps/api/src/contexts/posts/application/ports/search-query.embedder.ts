export interface SearchQueryEmbedder {
  embed(query: string): Promise<number[] | null>;
}
