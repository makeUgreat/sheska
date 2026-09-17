DROP INDEX "source_sync_jobs_active_source_fingerprint_unique";

UPDATE "source_sync_jobs"
SET "status" = 'waiting'
WHERE "status" IN ('pending', 'processing');

CREATE UNIQUE INDEX "source_sync_jobs_active_source_fingerprint_unique"
ON "source_sync_jobs" ("source_id", "fingerprint")
WHERE "status" = 'waiting';
