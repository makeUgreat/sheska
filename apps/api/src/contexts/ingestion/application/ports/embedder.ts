export interface Embedder {
  embed(
    text: string,
    options?: { signal?: AbortSignal },
  ): Promise<{ embedding: number[]; model: string }>;
}
