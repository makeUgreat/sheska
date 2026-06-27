---
title: API DDD Convention
lang: en
audience: both
applies_to:
  - apps/api
translation: ../ko/ddd.md
related:
  - ./architecture.md
---

# API DDD Convention

DDD terms in this API are used to define model ownership, language boundaries, and business behavior.
They are not only folder names.

## Bounded Contexts

- A bounded context is the boundary where a specific domain model and ubiquitous language are valid.
- The same word may have a different meaning in a different bounded context.
- Code outside a bounded context MUST NOT directly modify the context's internal model.
- Code outside a bounded context SHOULD NOT depend on the context's internal domain objects.
- Contexts communicate through IDs, DTOs, events, ports, or anti-corruption layers.
- A bounded context is defined by model, language, and responsibility boundaries, not by a folder name alone.

## Implementation Modules

- An implementation module is a practical code wiring or framework module unit.
- An implementation module is not automatically a DDD bounded context.
- Other bounded contexts SHOULD interact through public application contracts, IDs, DTOs, events, or ports instead of reaching into internal domain objects.

## Domain Kernel

- `kernels/domain` contains domain-layer kernel code shared by context domain layers.
- Domain-kernel code may include stable domain-layer policies and stable domain concepts intentionally shared by multiple bounded contexts.
- Domain-kernel code has business meaning when it models a shared domain concept.
- Review shared domain concept changes with the affected context owners.
- `kernels/domain` MUST NOT be used as a generic duplication-removal directory.
- Prefer duplication over premature domain-kernel code when the shared concept is unstable or context-specific.
- Prefer `kernels/domain` for small, stable domain concepts such as `Money`, `Currency`, or `DateRange`.
- Do not create shared domain concept code until multiple bounded contexts intentionally share a stable domain concept.

## Domain Model Building Blocks

- Aggregates protect consistency boundaries and expose behavior through the aggregate root.
- Entities have identity and lifecycle.
- Generic entity identity mechanics, such as ID normalization and empty-ID validation, belong in shared `Entity`/`AggregateRoot`; context aggregates should keep only context-specific identity rules.
- Value objects describe immutable domain values and validate their own invariants.
- When repositories belong to the domain layer, they represent domain persistence needs as contracts, not database implementation details.
- Domain services contain business rules that do not naturally belong to one entity or value object.
- Domain events describe meaningful business facts that already happened.
- Domain errors describe business rule failures and should not contain transport, database, or framework details.

## Domain Factory Methods

- Factory method names should make the creation path clear.
- `create` usually starts a new aggregate or entity lifecycle, `restore` rebuilds an existing one from persistence or another trusted snapshot, and `of` is commonly used for value objects or identity-free domain values.
- Factory methods MUST call `construct` directly instead of delegating to another factory method such as `create`, `restore`, or `of`.
- If a creation path needs unusual identity or lifecycle behavior, make that intent clear in the factory name or nearby documentation.

## Repository Method Naming

- `save` persists an aggregate through the repository contract. Use it for create and update unless the context has a meaningful separate command.
- `find` looks up one aggregate or read model by a unique lookup and returns `null` when it is absent.
- `find` should express lookup meaning through object parameter field names, not method suffixes such as `findBy...`. Example: `find({ id })`, `find({ externalSourceId })`.
- `get` means the caller expects the resource to exist. Use it only when absence is exceptional in that contract; otherwise prefer `find`.
- `get` uses the same object parameter naming as `find`. Example: `get({ id })`.
- `list` returns multiple aggregates or read models. It SHOULD accept an explicit criteria object when filtering is needed.
- `find` and `get` criteria objects should express only unique lookups that identify one resource. Use `list` for filtering that can return multiple results.
- Avoid repository method names that expose storage mechanics, query implementation, or table shape.

## Domain Encapsulation

- Domain objects SHOULD expose behavior through intention-revealing methods instead of generic getters that mirror internal props.
- Avoid getters and snapshots whose main purpose is to let callers inspect domain state and make domain decisions outside the object.
- Ask the object to answer a domain question or perform a domain action, such as `isPublishable`, `hasContentHash`, or `markDeleted`, instead of pulling fields out and deciding externally.
- DTO, persistence, or presentation mapping MAY use explicit mappers or purpose-specific read models at layer boundaries, but those shapes should not become the domain model's default API.
- Value objects MAY expose a primitive value when the value itself is the domain concept; entities and aggregates should prefer behavior-oriented APIs.

## Domain API Type Extraction

- Prefer inline object types for simple method parameters or return values that are used by one method and are easy to understand from the method name.
- Use local, non-exported types when a shape is reused inside one aggregate, would make signatures noisy, or represents internal restore/persistence mapping details.
- Export method parameter, result, and status types only when another layer or bounded context should import them as a stable contract.
- Do not create `Params`, `Result`, or `Status` types only because a method is public.
- Prefer a domain name over a mechanical suffix when a type is worth naming; otherwise keep the shape inline.

## Review Rules

- Check whether a new shared abstraction is really a stable domain concept before making it domain-kernel code.
- Check whether a bounded context's public language is leaking another context's internal model.
- Check whether a domain object is expressing business behavior instead of acting as a database row or request DTO.
- Check whether communication across model boundaries uses IDs, DTOs, events, ports, or anti-corruption mapping.
