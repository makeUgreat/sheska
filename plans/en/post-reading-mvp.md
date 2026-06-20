---
title: Post Reading MVP
lang: en
audience: both
applies_to:
  - post-reading
translation: ../ko/post-reading-mvp.md
---

# Post Reading MVP

## Intent

Sheska lets users publish selected Markdown posts from a local Obsidian writing workflow as a hosted blog.
The first product capability is post reading because it establishes the public content model, rendering expectations, URL shape, and later source data for search and RAG.

## Current Understanding

Users write posts in local Obsidian.
Only posts explicitly selected for publication should become visible in Sheska.
The publication whitelist starts with a frontmatter field: `published: true`.

The first MVP should prove that a public Markdown post can be listed and read in a browser.
The data source for this MVP is internal sample Markdown stored with the app, not the user's real Obsidian vault or private GitHub repository.

Post reading is the foundation for later storage and AI features.
The implementation should avoid decisions that would block future synchronization from Obsidian, private GitHub ingestion, database-backed search, or RAG indexing.

## MVP Scope

- Use internal sample Markdown as the only content source.
- Treat `published: true` as the public visibility rule.
- Provide a post list and post detail reading flow.
- Render Markdown content for browser reading.
- Keep the UI minimal enough to validate reading behavior rather than final blog design.

## Out Of Scope

- Synchronizing from a local Obsidian vault.
- Pulling Markdown from a private GitHub repository.
- Persisting content in a database.
- Search, embedding, or RAG.
- Formal support for Obsidian attachment paths.
- Formal support for Grafana embeds, scripts, iframes, or other raw HTML integrations.
- A polished full blog UI.

## Open Decisions

- How the app will synchronize whitelisted Obsidian files into app-owned storage.
- Whether the long-term content source of truth is the Obsidian repository, the app database, or both with clear sync ownership.
- How attached images should be copied, hosted, addressed, and authorized.
- Which Markdown and HTML extensions are allowed for safe public rendering.
- How post content should be modeled for search, RAG chunking, and embedding refresh.
- Whether additional frontmatter fields are needed for slug, title, publication date, tags, summary, or draft state.

## Sync References

Keep this document synchronized when the post reading behavior, public visibility rule, Markdown source policy, or content ingestion direction changes.
