-- Track chunk-level embedding progress on source sync jobs

ALTER TABLE "source_sync_jobs"
  ADD COLUMN "total_chunks" integer,
  ADD COLUMN "processed_chunks" integer NOT NULL DEFAULT 0;