export const EMBEDDING_CLIENT = Symbol('EMBEDDING_CLIENT');

export interface EmbeddingClient {
  embed(text: string): Promise<{ embedding: number[]; model: string }>;
}
