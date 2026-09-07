---
title: API DDD Convention
lang: en
audience: both
applies_to:
  - apps/api
translation: ../../ko/architecture/ddd.md
related:
  - ./architecture.md
  - ./context-integration.md
  - ./source-dependency.md
  - ../persistence/persistence.md
  - ../persistence/repository-methods.md
---

# API DDD Convention

## Scope

- Use this document when deciding bounded context boundaries, domain model ownership, shared domain language,
  domain-kernel usage, and repository contract names.
- Use the related conventions for decisions outside this document's scope.
  - Use the [architecture convention](./architecture.md) for the source map.
  - Use the [source dependency convention](./source-dependency.md) for import direction.
  - Use the [persistence policy](../persistence/persistence.md) for database and ORM boundaries.

## Model Boundaries

### Bounded Contexts

- A bounded context owns a domain model, ubiquitous language, and responsibility boundary.
  - The same word may have a different meaning in a different bounded context.
  - A folder name may indicate a context, but the boundary is justified by model, language, and responsibility.
- Code outside a bounded context MUST NOT directly modify the context's internal model.
  - Code outside a bounded context SHOULD NOT depend on the context's internal domain objects.
  - Contexts communicate through IDs, DTOs, events, ports, or anti-corruption layers.

### Implementation Modules

- An implementation module is a practical code wiring or framework module unit.
  - An implementation module is not automatically a DDD bounded context.

## Domain Kernel

- `kernels/domain` contains domain-layer kernel code shared by context domain layers.
  - Domain-kernel code may include stable domain-layer policies.
  - Domain-kernel code may include stable domain concepts intentionally shared by multiple bounded contexts.
  - Review shared domain concept changes with the affected context owners.
- `kernels/domain` MUST NOT be used as a generic duplication-removal directory.
  - Prefer duplication over premature domain-kernel code when a concept is unstable or context-specific.

## Domain Model Building Blocks

- DDD building blocks are chosen by the domain role they play, not by where a class happens to live.

### Project-Relevant Building Block Roles

| Concept | Role |
|---|---|
| Entity | Domain object with identity whose state can change during its lifecycle. |
| Value Object | Immutable object whose meaning is determined by its values, not by identity. |
| Aggregate | Group of entities and value objects whose consistency must be protected together. |
| Aggregate Root | Only externally reachable entry point into an aggregate; it protects aggregate invariants. |
| Repository | Domain collection-like abstraction for saving and retrieving aggregates; it is not a database query helper. Repository reads are **read-for-write**: aggregates are loaded to call domain methods on them or to verify preconditions before a write. |

### Responsibility Placement

- Put a rule in the domain when it is a business invariant that must hold regardless of caller, storage, transport, or
  use case entry point.
- Put orchestration in the application layer when code decides what to load, authorize, call, transact, and save to
  execute a use case.
  - Application services and use cases load needed objects, call domain methods or domain services, and save changes.
  - Application services and use cases should not implement domain judgments directly.
- Put implementation in the infrastructure layer when code decides how to query, persist, publish, call an external
  API, or use a technical library.

### Value Object Raw Value Access

- Use `unpack()` to read the raw value from a value object.
  - When reading several fields from a composite value object, call `unpack()` once and reuse the result.

## Repository Method Naming

- `save` persists an aggregate through the repository contract.
  - Use `save` for create and update unless the context has a meaningful separate command.
- `find` looks up one aggregate by a unique lookup and returns `null` when it is absent.
  - Express the lookup meaning through object parameter field names.
  - Examples: `find({ id })`, `find({ externalSourceId })`.
- `get` means the caller expects the resource to exist.
  - Its return type MUST be `Promise<T>`, never `Promise<T | null>`.
  - When the resource is absent, the implementation throws `InfrastructureException(NOT_FOUND)`.
  - Use the same object parameter naming as `find`. Example: `get({ id })`.
- `find` and `get` criteria MUST be object types.
  - Primitive parameters such as `find(id: string)` or `get(sourceId: string)` are not allowed.
  - Use `find({ id })` or `get({ id })` instead.
  - Criteria objects should express only unique lookups that identify one resource.
  - Use `list` for filtering that can return multiple results.
- `list` returns multiple aggregates without pagination.
  - It SHOULD accept an explicit criteria object when filtering is needed.
- Avoid repository method names that expose storage mechanics, query implementation, or table shape.
  - Do not encode field names into method names; express them through criteria object fields instead.
  - Example: prefer `find({ sourceId })` over `findBySourceId(sourceId)`.
- For call-site guidance on when to use each method, see
  [Repository Method Usage Guide](../persistence/repository-methods.md).

## Domain Encapsulation

- Domain objects SHOULD expose behavior through intention-revealing methods.
  - Avoid generic getters that mirror internal props.
  - Avoid snapshots whose main purpose is to let callers inspect domain state and make domain decisions externally.
  - Ask the object to answer a domain question or perform a domain action instead of deciding externally.
  - Examples include `isPublishable`, `hasContentHash`, and `markDeleted`.
- DTO, persistence, or presentation mapping MAY use explicit mappers or purpose-specific read models at layer
  boundaries, but those shapes should not become the domain model's default API.
- Value objects MAY expose a primitive value when the value itself is the domain concept; entities and aggregates
  should prefer behavior-oriented APIs.

## Domain API Type Extraction

- Prefer inline object types for simple method parameters or return values that are used by one method and are easy to
  understand from the method name.
- Use local, non-exported types when a shape is reused inside one aggregate, would make signatures noisy, or
  represents internal restore/persistence mapping details.
- Export method parameter, result, and status types only when another layer or bounded context should import them as a
  stable contract.
  - Do not create `Params`, `Result`, or `Status` types only because a method is public.
  - Prefer a domain name over a mechanical suffix when a type is worth naming.
  - Keep the shape inline when the type is not worth naming.

## Review Checks

- Check whether a new shared abstraction is really a stable domain concept before making it domain-kernel code.
- Check whether a bounded context's public language is leaking another context's internal model.
- Check whether a domain object is expressing business behavior instead of acting as a database row or request DTO.
- Check whether a business invariant belongs in the domain instead of application orchestration or infrastructure
  implementation.
- Check whether a use case is invoking domain behavior instead of extracting state and making domain decisions
  externally.
- Check whether a repository is modeling aggregate storage and retrieval rather than exposing storage mechanics as a
  query helper.
- Check whether communication across model boundaries uses IDs, DTOs, events, ports, or anti-corruption mapping.
