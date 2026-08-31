CREATE INDEX IF NOT EXISTS "source_vectors_embedding_hnsw_idx"
  ON "source_vectors" USING hnsw ("embedding" vector_cosine_ops);
