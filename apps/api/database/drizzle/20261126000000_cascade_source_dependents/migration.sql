-- Deleting a source must take its sync jobs and embeddings with it in the same transaction.
ALTER TABLE "source_sync_jobs" DROP CONSTRAINT "source_sync_jobs_source_id_sources_id_fkey";
ALTER TABLE "source_sync_jobs"
  ADD CONSTRAINT "source_sync_jobs_source_id_sources_id_fkey"
  FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE;

ALTER TABLE "source_embeddings" DROP CONSTRAINT "source_embeddings_source_id_sources_id_fkey";
ALTER TABLE "source_embeddings"
  ADD CONSTRAINT "source_embeddings_source_id_sources_id_fkey"
  FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE;
