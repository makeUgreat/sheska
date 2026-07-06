export interface Embedder {
  embed(text: string): Promise<{ embedding: number[]; model: string }>;
}
