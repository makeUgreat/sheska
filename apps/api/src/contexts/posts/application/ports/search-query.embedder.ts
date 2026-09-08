export interface SearchQueryEmbedder {
  embed(
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<number[] | null>;
}
