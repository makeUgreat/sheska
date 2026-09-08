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

### Naming Vocabulary

- **Ports on both sides are named `<Concept>Lookup`** (or a plain capability verb when the port is a behavior
  rather than a data read, e.g. `Embedder`, `SearchQueryEmbedder`) — named for the capability it provides, in
  that side's own domain language, not for a borrowed OOP pattern word (`Service`, `Gateway`, `Facade`, ...).
  - The producer's own port and the consumer's own port do not need artificially different words. The ACL's
    folder location (`contexts/A/acl/<B-name>/`) already signals "this crosses a context boundary" — the port
    name doesn't have to say it again.
  - Token: `<CONCEPT>_LOOKUP`.
- **Both sides describing the same real-world concept can legitimately land on the identical name** (e.g. both
  ingestion's and sources' own port for embedding data are `SourceEmbeddingLookup`, each named independently in
  its own language). When that happens, alias the producer's import at the one or two files that see both sides
  — the ACL adapter and the consumer's module wiring factory — rather than mangling either port's name to avoid
  the alias:

```ts
import { type SourceEmbeddingLookup as IngestionSourceEmbeddingLookup } from '@contexts/ingestion';
import { type SourceEmbeddingLookup } from '@contexts/sources/application/ports';

export class SourceEmbeddingFromIngestionLookup implements SourceEmbeddingLookup {
  constructor(private readonly ingestionLookup: IngestionSourceEmbeddingLookup) {}
  // ...
}
```

- **Adapter naming**: `<Concept>From<B-name>Lookup` (e.g. `SourceEmbeddingFromIngestionLookup`). The `From<B-name>`
  segment is what actually marks it as cross-context — see Rule 2.
- **Producer-side implementation naming has no fixed template**, but the file still fills the same three slots as
  an infrastructure adapter — `{domain}.{what-it-collaborates-with}.{role}.ts` — even though it lives in
  `application/services/`, not `infrastructure/`, because it has no technology dependency.
  - Infrastructure adapters vary by *technology* (`ollama-http`, `pg-drizzle`). Application-layer implementations
    of a producer-owned port have no technology to vary by, so they vary by *collaborator* instead: which
    other application- or domain-owned dependency they compose to produce the answer.
  - Today's implementations collaborate with nothing but B's own repository, so the middle slot is
    `from-repository` and the role slot matches the port's own role (`lookup`): `source-embedding.from-repository.lookup.ts`
    → `SourceEmbeddingFromRepositoryLookup implements SourceEmbeddingLookup`.
  - This is not the only allowed collaborator. If a future implementation adds a cache or composes a second
    dependency, name that specific implementation for what it actually collaborates with instead of forcing it
    into `from-repository` or chaining qualifiers onto one name (e.g. a projection-backed implementation would be
    `source-embedding.from-projection.lookup.ts`). Multiple implementations of the same port are named
    independently; there is no single required middle segment across all of them.
  - Never use a bare `Impl` suffix — it names nothing about how the class does its job.
- **Return types are named for what they concretely hold**, not with a generic template suffix like `Info`,
  `Details`, `Data`, or the port's own name — those carry no more meaning than `Data` itself.
  - Example: ingestion's own concept is `EmbeddingMetadata` (model, dimensions, timestamps — metadata *about* an
    embedding, not the vector). Sources' own copy, in its own language, is `SourceEmbeddingMetadata` (this
    source's embedding metadata). Sources' own concept for its content is `SourceDocument`. Posts' own copy, in
    its own language, is `PublishableSourceContent` (the content posts uses to derive a post).
  - Keep the producer's and consumer's return type names distinct even when the shape is identical today — they
    are free to diverge later. Unlike port names, don't rely on an import alias here; these types are used
    throughout each side's own application code, not just at the one seam file.

## Implementation Rules

### Rule 1 — Port is owned by the consumer

- Location: `contexts/A/application/ports/`
- File naming follows `{domain}.{role}.ts` (e.g. `source-embedding.lookup.ts`).
- Named in A's domain language, not B's. (`SourceVectorRepository` ✗ → `SourceEmbeddingLookup` ✓)
- Contains only the methods A actually needs.
- Returns A's own plain data types. Never exposes B's aggregates or value objects.

### Rule 2 — Adapter lives in the consumer's ACL

- Location: `contexts/A/acl/<B-name>/`, where `<B-name>` is the producer context name. The ACL is a dedicated
  layer, separate from `infrastructure/`, because crossing a bounded context boundary is a different kind of
  outer dependency than reaching a concrete technology — see the
  [source dependency convention](./source-dependency.md#anti-corruption-layer-acl).
- File and class naming reuses the same three-slot shape as an infrastructure adapter: `{domain-name}.{adapter-or-purpose}.{role}.ts`.
  - For a cross-context Pull adapter, the `adapter-or-purpose` segment is `from-<B-name>` (e.g. `source-embedding.from-ingestion.lookup.ts` → `SourceEmbeddingFromIngestionLookup`).
  - The `from-` prefix makes the file identifiable as a cross-context adapter by name alone, without depending on the folder path being visible.
  - The `from-` prefix also avoids ambiguity when the domain-name and producer context name are lexically similar (e.g. `source` vs `sources`).
- Outside A's module wiring, this adapter is the only file in A that may import from B.
  - A's module wiring, and this adapter, may import only B's public surface: `contexts/B/index.ts`, via the bare
    `@contexts/B` alias.
  - B's root-level `B.di-tokens.ts` and `B.module.ts` are B's internal wiring files. Another context must never
    import them directly, even though they sit outside `domain/`, `infrastructure/`, `presentation/`, and `acl/`.
- The adapter binds to B's application-layer port, never to B's domain-layer repository or other domain-owned
  contract.
  - A domain-layer contract exists to serve B's own use cases. B's own `B.di-tokens.ts` may still re-export it for
    B's internal cross-boundary needs (e.g. connecting `forFeature()` to `forRoot()`), but that export is not a
    standing invitation for another context to bind to it — and it must never reach `contexts/B/index.ts`.
  - If B has no application-layer port that fits A's need, B adds one that wraps the domain-layer contract. Do not
    let A reach past it.
- B's domain objects do not appear outside this adapter file.

### Rule 3 — DI token is owned by the consumer

- Declare in `contexts/A/a.di-tokens.ts`.
- B's DI tokens are only referenced inside A's module wiring factory — never in A's domain or application code.
- B decides which of its own tokens and types are safe for other contexts by curating `contexts/B/index.ts`.
  - Only application-layer ports and the DI tokens that resolve them belong in `index.ts`.
  - Domain-layer contracts, even ones `B.di-tokens.ts` re-exports for B's own use, never appear in `index.ts`.

### Rule 4 — Cross-context query belongs in the use case, not the controller

- Controllers map HTTP ↔ use case only. They do not orchestrate data from multiple sources.
- Use cases inject the port and coordinate all data needed to produce a result.

### Rule 5 — Wiring belongs in the consumer's module

- `AModule.forRoot()` declares the adapter provider and injects the token B exports from `contexts/B/index.ts` in
  the factory.
- Injecting B's DI token inside A's module factory is acceptable — this is ACL wiring, not domain coupling.

## Review Checks

- Check whether the cross-context port is owned by the consumer, not a shared module or the producer.
- Check whether imports from B are limited to the adapter and B's `index.ts` public surface required by A's module
  wiring — never B's `B.di-tokens.ts` or `B.module.ts` directly.
- Check whether the adapter binds to a producer application-layer port, not a producer domain-layer repository or
  other domain-owned contract.
- Check whether the producer's `index.ts` re-exports only application-layer ports and their tokens, never a
  domain-layer contract.
- Check whether the port returns A's own types, not B's aggregates or value objects.
- Check whether cross-context data gathering happens in a use case rather than a controller.
- Check whether the Pull strategy is still the right choice, or whether demonstrated availability or latency issues justify switching to a Read Model.
