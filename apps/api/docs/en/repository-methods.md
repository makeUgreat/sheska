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

## Repository vs Query Port

### Read-for-write vs Read-for-display

Every multi-aggregate retrieval falls into one of two categories:

| Category | Definition | Where to implement |
|---|---|---|
| **Read-for-write** | Load the aggregate so you can call domain methods on it or verify its existence as a precondition before a write | Repository (`list`) |
| **Read-for-display** | Fetch data to present to a caller without invoking domain behavior afterward | Application Query port (`paginate`, `search`) |

Use `repository.list()` when the caller needs full aggregate objects:
- To invoke domain methods (`post.incrementViewCount()`, `source.syncContentSnapshot(...)`)
- To check domain invariants before a state change

Use `query.paginate()` / `query.search()` when the caller just needs flat data for display:
- Paginated lists with cursor
- Read models that combine fields from multiple aggregates
- Any retrieval where the use case calls no domain methods on the returned objects

### JOIN policy

| Layer | Allowed JOINs |
|---|---|
| **Repository** | Intra-aggregate only. A repository JOIN reconstructs a single aggregate from its tables (root + child entities + embedded value objects). It MUST NOT JOIN outside the aggregate boundary to pull in data from another aggregate or context. |
| **Query Port** | Cross-aggregate and cross-context JOINs are allowed. A query port implementation may JOIN any tables needed to build the read-model projection. This is its main advantage over a repository read. |

### Standard Query port method names

| Method | Semantics |
|---|---|
| `get` | Return one item; throw when absent |
| `find` | Return one item or `null` when absent |
| `paginate` | Return a page of items with a cursor for the next page |
| `search` | Return a relevance-ranked page of items matching a query string |
| `count` | Return the number of matching items |
| `exists` | Return `true`/`false` whether at least one matching item exists |

Define only the methods your context actually needs. Do not add methods speculatively.
