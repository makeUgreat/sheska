-- Rename source_vectors to source_embeddings to distinguish pgvector embedding
-- storage from tsvector full-text-search columns (title_search_vector,
-- content_search_vector), which both used the ambiguous "vector" term.

ALTER TABLE "source_vectors" RENAME TO "source_embeddings";
--> statement-breakpoint
ALTER TABLE "source_embeddings" RENAME CONSTRAINT "source_vectors_pkey" TO "source_embeddings_pkey";
--> statement-breakpoint
ALTER TABLE "source_embeddings" RENAME CONSTRAINT "source_vectors_source_id_sources_id_fkey" TO "source_embeddings_source_id_sources_id_fkey";
--> statement-breakpoint
ALTER INDEX "source_vectors_embedding_hnsw_idx" RENAME TO "source_embeddings_embedding_hnsw_idx";
