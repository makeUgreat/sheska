---
title: Repository Method Usage Guide
lang: en
audience: both
applies_to:
  - apps/api
translation: ../../ko/persistence/repository-methods.md
read_when:
  - Choosing a repository or query-port method at an application call site.
related:
  - ../architecture/ddd.md
  - ../architecture/context-integration.md
  - ./persistence.md
  - ../operability/error.md
---

# Repository Method Usage Guide

## Scope

- Use this guide to choose repository and query-port methods at call sites.
- Use related policies for decisions outside this guide.
  - Method names and repository contracts: [DDD convention](../architecture/ddd.md).
  - Database and mapper behavior: [persistence policy](./persistence.md).
  - Exception ownership and translation: [error policy](../operability/error.md).

## `get` vs `find`

### Decision Rule

- Use `find` when absence is an expected state that controls the application flow.
  - It returns `null` when no item matches.
- Use `get` when the caller requires the item to exist.
  - It returns the item or throws `InfrastructureException` with `kind: 'not_found'`.
  - Its return type does not include `null`.

### Use `find` for Branching

- Use `find` when the call site must branch on absence, for example:
  - Create when no aggregate exists and update when one does.
  - Detect a conflict when an aggregate already exists.
  - Skip an event whose target was removed by an expected race.

```ts
const source = await this.sources.find({ externalSourceId });
if (!source) {
  return this.persistChange(Source.create({ externalSourceId, ...snapshot }));
}
source.syncContentSnapshot(snapshot);
```

```ts
const existing = await this.posts.find({ sourceId });
if (existing) {
  throw new ApplicationException({ kind: STATE_CONFLICT, ... });
}
```

```ts
const syncJob = await this.syncJobs.find({ id: event.syncJobId });
if (!syncJob) return;
```

### Use `get` for Required State

- Use `get` when continuing the use case requires the item.

```ts
const post = await this.posts.get({ id: command.postId });
// No null branch is required.
```

- Do not call `find` only to throw an equivalent `not_found` error immediately.
  - Use `get` when the repository's not-found error already has the required meaning.
  - Keep `find` when absence must be translated into a distinct application-owned failure.

## Repository vs Query Port

### Aggregate vs Projection

- Use a repository when the caller needs domain objects.
  - Invoke domain behavior on the returned aggregate.
  - Evaluate domain state before a change.
  - Restore one or more complete aggregates with `get`, `find`, or `list`.
- Use an application query port when the caller needs a read projection without domain behavior.
  - Return paginated or search results.
  - Combine fields from multiple aggregates or contexts.
  - Shape data for an application result without reconstructing aggregates.
- Choose by the required result and behavior, not by the number of returned rows.

### JOIN Policy

- Repository implementations MAY join tables within one aggregate.
  - Use such joins only to restore the root, child entities, and embedded value objects.
  - They MUST NOT join another aggregate or bounded context into the repository result.
- Query-port implementations MAY join across aggregates and bounded contexts to build a read projection.
  - Keep the query contract owned by the consuming application layer.
  - Follow the [context integration convention](../architecture/context-integration.md) for cross-context access.

### Query-Port Method Names

- Use the standard name that matches the result contract:
  - `get`: return one item and throw when absent.
  - `find`: return one item or `null` when absent.
  - `paginate`: return a page and its next cursor.
  - `search`: return a relevance-ranked page for a query.
  - `count`: return the number of matching items.
  - `exists`: return whether at least one item matches.
- Define only methods required by the context.
  - Do not add speculative query methods.

## Review Checks

- Does absence drive a valid branch (`find`) or violate a required precondition (`get`)?
- Does the caller need a domain object (repository) or a read projection (query port)?
- Does a repository JOIN stay within one aggregate boundary?
- Is every query-port method required by an existing use case?
