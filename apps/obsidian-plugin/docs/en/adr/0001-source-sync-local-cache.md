---
title: "ADR 0001: Local mtime Cache for Source Auto-Sync"
lang: en
audience: both
applies_to:
  - apps/obsidian-plugin
translation: ../../ko/adr/0001-source-sync-local-cache.md
related:
  - ../index.md
---

# ADR 0001: Local mtime Cache for Source Auto-Sync

## Status

Accepted

## Context

- The plugin is gaining automatic upload of vault notes to `POST /sources`, replacing the current manual-only commands in `main.ts`.
- The planned trigger model is hybrid.
  - Vault `modify`/`create` events (debounced) for near-real-time upload.
  - A periodic full sweep that re-walks every in-scope note, to catch changes missed while the app was closed.
  - A lightweight sync-job reconciliation interval that checks cached incomplete jobs without walking or uploading every note.
- The server's no-op check happens too late to save upload cost.
  - `UploadSourceUseCase` de-duplicates by content fingerprint and no-ops an unchanged upload.
  - But `SourceContentSnapshotCalculator.calculate` hashes the full request body before that no-op branch runs.
  - So without client-side filtering, every sweep re-uploads full note content for every in-scope file, changed or not.
  - Cost scales with vault size × sweep frequency, not with actual edit rate.
- Considered a server-side batch diff endpoint (client sends lightweight `{path, hash}` pairs, server replies which changed) as an alternative.
  - Rejected: same reasoning as the sync policy's existing "no new server batch endpoint" decision for v1 — single trusted client, personal deployment, no case yet for more server surface.
- `TFile.stat.mtime` is free to read and always current.
  - Obsidian's own vault file watcher updates it automatically on any on-disk content change, in-app or external.
  - The same signal drives the `modify`/`create` vault events — no separate polling needed.
  - Reading it costs no disk I/O; Obsidian already holds it in its in-memory vault index.

## Decision

- Persist a local sync cache keyed by vault-relative file path (the same value used as `externalSourceId`).

  ```ts
  interface SyncCacheEntry {
    mtime: number;   // captured at content-read time, not after upload
    syncedAt: number;
  }
  type SyncCache = Record<string, SyncCacheEntry>;
  ```

- Store it via the plugin's existing `loadData()`/`saveData()` mechanism, under a key separate from `SheskaSettings`.
  - Reason: `saveSettings()` restarts the health-check interval as a side effect. Cache writes happen far more often and must not share that path.
- Before uploading a file — from an event or a sweep — compare `file.stat.mtime` against the cached entry.
  - No entry, or a mismatched mtime → upload candidate.
  - Matching mtime with a terminal `synced` state → skip. No HTTP request is sent.
  - Matching mtime with `accepted`, `processing`, `unknown`, `failed`, or `retrying` → the sync-job reconciliation loop performs a lightweight status request instead of uploading the note body.
  - Matching mtime with `needs-attention` → skip until the user manually retries or edits the note.
- Capture the mtime for the cache at the moment the content is read, before the network call — not by re-reading `stat.mtime` after the response resolves.
  - Reason: if a newer edit lands while the upload is in flight, re-reading afterward would record that newer edit's timestamp against content that was never actually sent, silently dropping it from future sync attempts.
- Record the cached mtime only after the server accepts the uploaded content.
  - A failed upload must not associate the current mtime with content the server did not accept.
- Treat active-file polling as responsive UI feedback and sync-job reconciliation as the background correctness mechanism.
  - Active-file polling may update the local state continuously while the note remains active.
  - Sync-job reconciliation runs every minute by default and checks every in-scope cached job whose state is not terminal, even when its note is inactive.
  - The full vault file sweep remains independent and runs every 30 minutes by default.
- Reconcile server sync-job states into the local cache before deciding whether to retry.
  - `pending` maps to `accepted`, `processing` remains `processing`, and `completed` maps to `synced`.
  - A polling timeout maps to `unknown`, because a client timeout does not prove that the server job failed.
  - A server-confirmed `failed` job is retried by uploading the same note and storing the newly returned sync-job ID.
- Limit automatic retries to three attempts per unchanged note version.
  - Persist `nextRetryAt` so retry delays survive plugin restarts.
  - Schedule the three retries 1 minute, 5 minutes, and 30 minutes after each server-confirmed failure.
  - Each reconciliation run performs at most one retry attempt for a file.
  - After retry exhaustion, store `needs-attention` and stop automatic retries.
  - A manual upload or a content edit starts a new attempt sequence and clears the previous retry count.
- Reuse the cache's key set as the previously-known-synced path list for delete detection, replacing the `GET /sources` cursor-pagination alternative floated in the sync policy.
  - Guard: delete detection MUST NOT run before the cache has completed at least one full backfill pass.
  - An empty or partial cache must never be read as "everything was deleted."

## Consequences

- Unchanged notes in the terminal `synced` state cost zero network and server work per sweep.
  - Only modified files and server-confirmed failed jobs reach `POST /sources`.
- Incomplete sync jobs cost one status request per reconciliation interval while they remain incomplete.
  - Accepted cost: the bounded request restores local state after missed polling, plugin restarts, and inactive-note failures without re-uploading full note bodies.
- Server-confirmed failed jobs waiting for `nextRetryAt` do not issue repeated status requests.
  - The server failure is already terminal, so another request would not add information before the retry is due.
- Permanently failing note versions stop after three automatic retries and require manual attention.
  - Accepted cost: some transient failures may require a manual retry after exhaustion, which is preferable to creating unbounded failed jobs.
- Delete detection gets a local source of truth for free, with no extra API calls.
- Accepted cost: cache loss (plugin reinstall, corrupted `data.json`) triggers one full-price resync pass.
  - Acceptable because it's bounded and self-healing, not a correctness bug.
- Accepted cost: mtime-only comparison can miss a real content change if an external tool rewrites content without bumping mtime.
  - Acceptable because the event-based path is the primary correctness mechanism; the sweep is a safety net, not the only line of defense.
- Open follow-up: the delete-detection bootstrap guard's concrete implementation (how the plugin tracks "backfill complete") is required, but not decided by this ADR.
