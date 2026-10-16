ALTER TABLE "source_embeddings"
  ADD COLUMN "sync_job_id" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "source_embeddings"
  ALTER COLUMN "sync_job_id" DROP DEFAULT;
