---
title: API Persistence Policy
lang: en
audience: both
applies_to:
  - apps/api
translation: ../../ko/persistence/persistence.md
read_when:
  - Changing a database schema, migration, persistence adapter, mapper, or storage constraint.
related:
  - ../architecture/ddd.md
  - ../architecture/infrastructure.md
  - ../architecture/source-dependency.md
  - ./repository-methods.md
  - ../operability/observability.md
---

# API Persistence Policy

## Scope

- Use this policy for database schemas, migrations, persistence adapters, and persistence mappers.
- Use related conventions for decisions outside this document's scope.
  - Use the [DDD convention](../architecture/ddd.md) for domain ownership and repository contract names.
  - Use the [source dependency convention](../architecture/source-dependency.md) for layer boundaries.
  - Use the [infrastructure convention](../architecture/infrastructure.md) for adapter files and directories.
  - Use the [repository method guide](./repository-methods.md) to choose methods at call sites.
- Persistence code MAY know database and ORM details.
- Persistence code MUST NOT become the source of business meaning.

## Responsibility Boundary

- Domain code owns domain and business invariants.
- Application code owns use-case orchestration and application contract constraints.
  - These include transaction boundaries, authorization, and input/output flow.
- Persistence code stores and restores state through application-owned ports.
- Persistence code MUST NOT duplicate domain or business invariants as table validation.
- Persistence code MAY enforce structural integrity needed for reliable rows, relations, and lookups.

## Storage Shape

### Database Constraints

- Structural constraints MAY include:
  - Primary keys and foreign keys.
  - Unique and not-null constraints.
  - Indexes and storage defaults such as timestamps.
- Use unique constraints for lookup identity, idempotency keys, or application-contract storage uniqueness.
- Do not use database-native enum types.
  - Store enum-like values in scalar columns.
  - Keep allowed-value meaning in the owning domain or application contract.
- Do not duplicate domain validation with `CHECK` constraints, enum restrictions, triggers, or equivalents.
  - Domain-owned examples include non-empty strings, numeric ranges, state transitions, and content consistency.

### Search Vector Columns

- Put a `tsvector` column on the same table as the field it indexes.
- Define it as `GENERATED ALWAYS AS (...) STORED`.
  - Application code MUST NOT write the derived value.
  - A trigger MUST NOT update a derived column on another aggregate's table.
- Keep each aggregate's search vector separate even when a read query joins and ranks across aggregates.
  - For example, keep `posts.title_search_vector` separate from `sources.content_search_vector`.
- Define reusable tokenization, such as CJK bigram splitting, once in a migration.
  - Use a plain `IMMUTABLE` SQL or PL/pgSQL function.
  - Reuse it from generated columns instead of duplicating it or implementing it in application code.
- Treat search vectors as storage-integrity and read-performance projections, not business rules.

### Drizzle Schema

- Drizzle table definitions describe storage shape, relations, indexes, and structural constraints.
- Do not define PostgreSQL enum types with `pgEnum` or equivalent migration output.
- Avoid Drizzle `check` definitions for domain or business invariants.
- TypeScript-only narrowing MAY improve adapter ergonomics.
  - Domain code remains responsible for validation and state transitions.
- Generated migrations and snapshots MUST match the intended policy, not only the latest schema output.

## Boundary Mapping

- Persistence mappers translate between database rows and domain objects at the infrastructure boundary.
- A mapper owns:
  - Validation of the persistence row shape.
  - Restoration from a persistence row to a domain object.
  - Conversion from a domain object to an insert row.
- Restore database rows through domain construction or restoration APIs.
  - The restoration path MUST validate domain invariants without recording domain events.
- Let domain restoration exceptions propagate unchanged.
  - Do not relabel them as persistence errors merely because restoration occurred in an adapter.
- Split aggregate mappers by the aggregate or entity they restore.
  - Do not collect unrelated mappings in one adapter-wide mapper.
- Domain-to-insert mapping MAY trust a domain object that has already passed its invariants.
  - Add adapter validation only for an additional storage-specific constraint.

## Repository Adapters

- Repository implementations own database calls and query composition.
- Wrap vendor or storage errors when adapter context improves the failure.
  - Do not use this wrapping rule for domain restoration exceptions.
- A `save` method that returns a domain object MUST restore it from the database-returned row.
  - Do not return the original input object.
- Follow the [infrastructure naming rules](../architecture/infrastructure.md) for repository and mapper files.

### Raw SQL Operation Names

- In a raw Drizzle `sql` template passed to `db.execute`, keep the leading verb and next token on one line.
  - Write `SELECT id, name`, not `SELECT\n  id, name`.
- `@opentelemetry/instrumentation-pg` uses the first literal space to derive the operation name.
  - A newline after the verb can produce a different telemetry label for the same logical operation.
  - See the [observability convention](../operability/observability.md) for telemetry label policy.

## Review Checks

- Does each database constraint protect storage integrity rather than duplicate a domain invariant?
- Does the Drizzle schema leave business meaning with the domain or application layer?
- Do repository and mapper changes preserve domain validation at the boundary?
- Does returned persisted state come from the database-returned row?
