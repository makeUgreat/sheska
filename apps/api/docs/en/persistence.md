---
title: API Persistence Policy
lang: en
audience: both
applies_to:
  - apps/api
translation: ../ko/persistence.md
related:
  - ./architecture.md
  - ./ddd.md
  - ./source-dependency.md
---

# API Persistence Policy

Persistence policy decides how database and ORM adapters preserve stored data without taking ownership of domain rules.

## Scope

- This policy applies to API persistence adapters, database schemas, migrations, and persistence mappers.
- Use the DDD convention for domain ownership and the source dependency convention for layer boundaries.
- Persistence code may know database and ORM details, but it must not become the source of business meaning.

## Storage Ownership

### Responsibility Boundary

- Domain and application code own domain and business invariants.
- Persistence code stores and restores state for application ports.
- Persistence code must not enforce domain or business invariants with database table validation.
- Persistence code may enforce storage integrity that is required for reliable rows, relations, and lookups.

## Storage Shape

### Database Constraints

- Allowed structural constraints include primary keys, foreign keys, unique constraints, not-null columns, indexes, and storage defaults such as timestamps.
- Use unique constraints when they protect repository lookup identity, idempotency keys, or storage-level uniqueness required by an application contract.
- Do not use database-native enum types. Store enum-like values in scalar columns and keep allowed-value meaning in domain/application code.
- Do not duplicate value object or aggregate validation as `CHECK` constraints, database enum restrictions, triggers, or equivalent table-level validation.
- Examples of domain-owned rules include trimmed non-empty strings, numeric ranges, lifecycle status transitions, and content-derived consistency checks.

### Drizzle Schema

- Drizzle table definitions should describe storage shape, relations, indexes, and structural constraints.
- Do not define PostgreSQL enum types with Drizzle `pgEnum` or equivalent migration output.
- Avoid Drizzle `check` definitions for domain or business invariants.
- TypeScript-only narrowing in Drizzle schema may be used for adapter ergonomics, but domain code remains the owner of validation and state transitions.
- Generated migrations and snapshots should match the intended persistence policy, not merely the latest local schema output.

## Boundary Mapping

### Repository Mapping

- Persistence mappers translate between database rows and domain objects at the infrastructure boundary.
- Restoring a database row into a domain object must still pass through domain construction or restoration APIs.
- If domain restoration rejects a stored row with a domain error, keep that domain error unchanged instead of weakening the domain model or relabeling the error as persistence failure.

### Persistence Mapper Policy

- Repository implementations own database calls, query composition, and vendor or storage-only failure conversion to repository contract errors.
- Persistence mappers own restoration input shape validation, persistence row to domain restoration, and domain object to insert row conversion.
- Persistence mapper restoration methods should return `Result` instead of throwing. When domain restoration returns a domain error, mappers and repositories should pass it through unchanged.
- Do not wrap mapper-returned domain errors as repository or persistence errors only because the error occurred while restoring a row.
- Aggregate persistence mappers should be split by restored aggregate or entity. Avoid collecting unrelated aggregate mappings in one adapter-wide mapper.
- Persistence adapter file names should read `{domain-name}.{purpose-or-adapter}.{role}.ts` so the subject, boundary, and role stay sortable and easy to search.
- Name persistence mapper files `{aggregate-or-entity}.persistence.mapper.ts` and classes `{AggregateOrEntity}PersistenceMapper`, such as `source.persistence.mapper.ts` and `SourcePersistenceMapper`.
- Name concrete repository adapter files `{aggregate-or-entity}.{adapter}.repository.ts` and classes `{AggregateOrEntity}{Adapter}Repository`, such as `source.drizzle.repository.ts` and `SourceDrizzleRepository`.
- Error mapper files may use `{owner}-error.mapper.ts` when the mapped subject is an error family instead of an aggregate or entity.
- Domain objects restored from persistence should expose a `restore` path that validates domain invariants and does not record domain events.
- Repository `save` methods that return a domain object should return the domain object restored from the database-returned row, not the original input object.
- Domain-to-insert mapping may trust domain objects that already passed domain invariants. Use duplicate insert validation only when the adapter has an additional storage-only constraint.

## Review Checks

- Check whether a new database constraint protects storage integrity or reimplements a domain invariant.
- Check whether a Drizzle schema change makes the database the owner of business meaning.
- Check whether repository and mapper changes preserve domain validation at the boundary.
