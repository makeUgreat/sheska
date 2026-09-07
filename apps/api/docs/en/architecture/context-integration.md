---
title: API Context Integration Convention
lang: en
audience: both
applies_to:
  - apps/api
translation: ../../ko/architecture/context-integration.md
related:
  - ./ddd.md
  - ./source-dependency.md
  - ./runtime-wiring.md
---

# API Context Integration Convention

- This document defines how to integrate data or behavior across bounded context boundaries.

## Scope

- Use this document when context A needs data or behavior owned by context B.
- Use the [DDD convention](./ddd.md) for model ownership and boundary decisions.
- Use the [source dependency convention](./source-dependency.md) for import direction and layer boundary rules.
- Use the [runtime wiring convention](./runtime-wiring.md) for provider registration and module wiring rules.

## Integration Strategy

### Default Strategy: Pull (Consumer-Owned Port + Adapter)

- When context A (consumer) needs data owned by context B (producer), the default strategy is Pull: A queries B at request time through a port A defines and owns.

- **Use Pull when:**
  - Both contexts run in the same process with the same database.
  - No demonstrated availability or latency problem exists between the two contexts.

- **Switch to Push (Read Model) when:**
  - Producer failures or latency regularly degrade consumer responses in practice.
  - Contexts are split into separate processes or databases.

- Choose between Pull and Push by their coupling trade-off.
  - Pull gives always-fresh data but creates temporal coupling: both contexts must be alive at the same moment.
  - Push removes temporal coupling but introduces eventual consistency and requires event infrastructure, projection logic, and drift management.
  - Neither Pull nor Push eliminates coupling; they shift coupling between availability and consistency.

### Why Not a Shared Module

- The port contract must not live in a shared or common module.
  - If `common` owns the interface, both A and B depend on `common`, creating a hidden hub that couples them through a third party.
  - The interface also tends to grow wide to serve hypothetical future consumers, violating Interface Segregation.

- Consumer-owned contracts stay narrow because they express exactly what A needs, nothing more.

## Implementation Rules

### Rule 1 — Port is owned by the consumer

- Location: `contexts/A/application/ports/`
- File naming follows `{domain}.{role}.ts` (e.g. `source-embedding.lookup.ts`).
- Named in A's domain language, not B's. (`SourceVectorRepository` ✗ → `SourceEmbeddingLookup` ✓)
- Contains only the methods A actually needs.
- Returns A's own plain data types. Never exposes B's aggregates or value objects.

### Rule 2 — Adapter lives in the consumer's infrastructure layer

- Location: `contexts/A/infrastructure/<B-name>/`, where `<B-name>` is the producer context name.
- File and class naming follow the [infrastructure adapter convention](./infrastructure.md): `{domain-name}.{adapter-or-purpose}.{role}.ts`.
  - For a cross-context Pull adapter, the `adapter-or-purpose` segment is `from-<B-name>` (e.g. `source-embedding.from-ingestion.lookup.ts` → `SourceEmbeddingFromIngestionLookup`).
  - The `from-` prefix makes the file identifiable as a cross-context adapter by name alone, without depending on the folder path being visible.
  - The `from-` prefix also avoids ambiguity when the domain-name and producer context name are lexically similar (e.g. `source` vs `sources`).
- Outside A's module wiring, this adapter is the only file in A that may import from B.
  - A's module wiring may import only B's public module and DI tokens needed to connect providers.
- B's domain objects do not appear outside this adapter file.

### Rule 3 — DI token is owned by the consumer

- Declare in `contexts/A/a.di-tokens.ts`.
- B's DI tokens are only referenced inside A's module wiring factory — never in A's domain or application code.

### Rule 4 — Cross-context query belongs in the use case, not the controller

- Controllers map HTTP ↔ use case only. They do not orchestrate data from multiple sources.
- Use cases inject the port and coordinate all data needed to produce a result.

### Rule 5 — Wiring belongs in the consumer's module

- `AModule.forRoot()` declares the adapter provider and injects B's exported token in the factory.
- Injecting B's DI token inside A's module factory is acceptable — this is infrastructure wiring, not domain coupling.

## Review Checks

- Check whether the cross-context port is owned by the consumer, not a shared module or the producer.
- Check whether imports from B are limited to the adapter and the public module or DI tokens required by A's module wiring.
- Check whether the port returns A's own types, not B's aggregates or value objects.
- Check whether cross-context data gathering happens in a use case rather than a controller.
- Check whether the Pull strategy is still the right choice, or whether demonstrated availability or latency issues justify switching to a Read Model.
