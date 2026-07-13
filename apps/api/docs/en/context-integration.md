---
title: API Context Integration Convention
lang: en
audience: both
applies_to:
  - apps/api
translation: ../ko/context-integration.md
related:
  - ./ddd.md
  - ./source-dependency.md
  - ./runtime-wiring.md
---

# API Context Integration Convention

This document defines how to integrate data or behavior across bounded context boundaries.

## Scope

- Use this document when context A needs data or behavior owned by context B.
- Use the DDD convention for model ownership and boundary decisions.
- Use the source dependency convention for import direction and layer boundary rules.
- Use the runtime wiring convention for provider registration and module wiring rules.

## Integration Strategy

### Default Strategy: Pull (Consumer-Owned Port + Adapter)

When context A (consumer) needs data owned by context B (producer), the default strategy is Pull: A queries B at request time through a port A defines and owns.

**Use Pull when:**
- Both contexts run in the same process with the same database.
- No demonstrated availability or latency problem exists between the two contexts.

**Switch to Push (Read Model) when:**
- Producer failures or latency regularly degrade consumer responses in practice.
- Contexts are split into separate processes or databases.

The core trade-off: Pull gives always-fresh data but creates temporal coupling — both contexts must be alive at the same moment. Push removes that coupling but introduces eventual consistency and requires event infrastructure, projection logic, and drift management. Neither eliminates the coupling; they shift it between availability and consistency.

### Why Not a Shared Module

The port contract must not live in a shared or common module. If `common` owns the interface, both A and B depend on `common`, creating a hidden hub that couples them through a third party. The interface also tends to grow wide to serve hypothetical future consumers, violating Interface Segregation.

Consumer-owned contracts stay narrow because they express exactly what A needs, nothing more.

## Implementation Rules

### Rule 1 — Port is owned by the consumer

- Location: `contexts/A/application/ports/`
- File naming follows `{domain}.{role}.ts` (e.g. `source-embedding.lookup.ts`).
- Named in A's domain language, not B's. (`SourceVectorRepository` ✗ → `SourceEmbeddingLookup` ✓)
- Contains only the methods A actually needs.
- Returns A's own plain data types. Never exposes B's aggregates or value objects.

### Rule 2 — Adapter lives in the consumer's infrastructure layer

- Location: `contexts/A/infrastructure/<B-name>/`, where `<B-name>` is the producer context name.
- File and class naming follow the [infrastructure adapter convention](./infrastructure.md).
- **This is the only file in A that may import from B.**
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
- Check whether the adapter is the only file in A that imports from B.
- Check whether the port returns A's own types, not B's aggregates or value objects.
- Check whether cross-context data gathering happens in a use case rather than a controller.
- Check whether the Pull strategy is still the right choice, or whether demonstrated availability or latency issues justify switching to a Read Model.