---
title: Development Integrations
lang: en
audience: both
applies_to:
  - repository
translation: ../ko/dev-integrations.md
---

# Development Integrations

External tools available during development and testing. Not used in CI or production.

Integration secrets are stored in `.dev-integrations.env` (gitignored, separate from app env files).
Copy `.dev-integrations.env.example` to get started.

## Available Integrations

| Integration | When to use |
|---|---|
| Playwright MCP | UI rendering, console errors, network inspection during frontend development |
| PostgreSQL MCP | Query the dev database, inspect schema or data. Connection via `DEV_DATABASE_URL` in `.dev-integrations.env`. |
| Redis MCP | Inspect dev cache state, keys, and values. Connection via `DEV_REDIS_URL` in `.dev-integrations.env`. |
| Obsidian Local REST API | Ad-hoc checks against a running Obsidian instance (plugin state, vault files, manifest) during `apps/obsidian-plugin` development. Auth via `OBSIDIAN_REST_API_KEY` in `.dev-integrations.env`. |
| Obsidian MCP | Deeper vault interaction during `apps/obsidian-plugin` development. Auth via `OBSIDIAN_MCP_API_KEY` in `.dev-integrations.env`. |
| Home k3s Cluster | Deployment verification, log inspection, infrastructure debugging. Connection info in `~/WebstormProjects/hash-infra` — see that repo's `CLAUDE.md`. |
