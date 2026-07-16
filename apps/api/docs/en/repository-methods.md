---
title: Repository Method Usage Guide
lang: en
audience: both
applies_to:
  - apps/api
translation: ../ko/repository-methods.md
related:
  - ./ddd.md
---

# Repository Method Usage Guide

This document complements the naming rules in [API DDD Convention](./ddd.md) with **call-site usage guidance** for repository methods. Read this when deciding which method to call, not which to name.

## `get` vs `find`

### Decision rule

| Method | When absent | Use when |
|--------|-------------|----------|
| `find` | Returns `null` | Null is a **valid state** that drives a branch in the business flow |
| `get` | Throws `InfrastructureException(NOT_FOUND)` | Absence is **exceptional** — the caller requires the resource to exist |

### When to use `find`

Use `find` when null carries meaning — it is a legitimate path, not an error.

**Upsert** — null triggers creation; non-null triggers update:
```ts
const source = await this.sources.find({ externalSourceId });
if (!source) return this.persistChange(Source.create(...));
source.syncContentSnapshot(snapshot);
```

**Conflict detection** — null means safe to proceed; non-null means conflict:
```ts
const existing = await this.posts.find({ sourceId });
if (existing) throw new ApplicationException({ kind: STATE_CONFLICT, ... });
```

**Graceful skip** — absence is an expected race condition in an event handler, not an error:
```ts
const syncJob = await this.syncJobs.find({ id: event.syncJobId });
if (!syncJob) return;
```

### When to use `get`

Use `get` when the caller requires the resource to exist and absence signals a bug or client error:

```ts
const post = await this.posts.get({ id: command.postId });
// throws NOT_FOUND automatically — no null check needed
```

### Anti-pattern to avoid

Catching `find` null only to throw `NOT_FOUND` duplicates what `get` already does:

```ts
// ❌ do not use find just to re-throw NOT_FOUND
const source = await this.sources.find({ id });
if (!source) throw new ApplicationException({ kind: NOT_FOUND, ... });

// ✓ use get — it throws NOT_FOUND automatically
const source = await this.sources.get({ id });
```