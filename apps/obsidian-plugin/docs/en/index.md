---
title: Obsidian Plugin Convention Index
lang: en
audience: both
applies_to:
  - apps/obsidian-plugin
translation: ../ko/index.md
related:
  - ./adr/0001-source-sync-local-cache.md
---

# Obsidian Plugin Convention Index

## Synchronization Policy

English and Korean `apps/obsidian-plugin` convention documents are paired documents that should describe the same policy.
When they conflict, choose the intended policy from either language and update both documents in the same change unit.

## Reading Rules

Read only the `apps/obsidian-plugin` documents relevant to the current task.
When changing public project Markdown documents, also read the repository documentation convention index.

## Architecture Decision Records

Durable design decisions for this plugin are recorded as ADRs under `adr/`. See the root [ADR Writing Guide](../../../../docs/en/adr.md) for numbering and writing style.

- Local sync change-detection, auto-sync cache invalidation, or delete-detection bootstrapping: read [ADR 0001: Local mtime Cache for Source Auto-Sync](./adr/0001-source-sync-local-cache.md).