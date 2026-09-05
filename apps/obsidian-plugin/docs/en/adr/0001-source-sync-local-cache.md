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
  - Matching mtime → skip. No HTTP request is sent at all.
- Capture the mtime for the cache at the moment the content is read, before the network call — not by re-reading `stat.mtime` after the response resolves.
  - Reason: if a newer edit lands while the upload is in flight, re-reading afterward would record that newer edit's timestamp against content that was never actually sent, silently dropping it from future sync attempts.
- Update the cache entry only on confirmed upload success.
  - Reason: leaving it untouched on failure makes the next event or sweep retry naturally, with no separate retry bookkeeping.
- Reuse the cache's key set as the previously-known-synced path list for delete detection, replacing the `GET /sources` cursor-pagination alternative floated in the sync policy.
  - Guard: delete detection MUST NOT run before the cache has completed at least one full backfill pass.
  - An empty or partial cache must never be read as "everything was deleted."

## Consequences

- Unchanged notes cost zero network and server work per sweep.
  - Only actually-modified files reach `POST /sources`.
- Delete detection gets a local source of truth for free, with no extra API calls.
- Accepted cost: cache loss (plugin reinstall, corrupted `data.json`) triggers one full-price resync pass.
  - Acceptable because it's bounded and self-healing, not a correctness bug.
- Accepted cost: mtime-only comparison can miss a real content change if an external tool rewrites content without bumping mtime.
  - Acceptable because the event-based path is the primary correctness mechanism; the sweep is a safety net, not the only line of defense.
- Open follow-up: the delete-detection bootstrap guard's concrete implementation (how the plugin tracks "backfill complete") is required, but not decided by this ADR.