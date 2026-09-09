-- Keep at most one active sync job for the same source content snapshot.
WITH ranked_active_jobs AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY source_id, fingerprint
      ORDER BY
        CASE status WHEN 'processing' THEN 0 ELSE 1 END,
        created_at,
        id
    ) AS active_rank
  FROM source_sync_jobs
  WHERE status IN ('pending', 'processing')
)
UPDATE source_sync_jobs AS jobs
SET status = 'failed'
FROM ranked_active_jobs AS ranked
WHERE jobs.id = ranked.id
  AND ranked.active_rank > 1;

CREATE UNIQUE INDEX source_sync_jobs_active_source_fingerprint_unique
ON source_sync_jobs (source_id, fingerprint)
WHERE status IN ('pending', 'processing');
