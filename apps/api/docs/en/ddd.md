---
title: API DDD Convention
lang: en
audience: both
applies_to:
  - apps/api
translation: ../ko/ddd.md
related:
  - ./index.md
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

## Shared Kernel

- `shared-kernel` contains the small part of the domain model intentionally shared by multiple bounded contexts.
- Shared-kernel code has business meaning.
- Review shared-kernel changes with the affected context owners.
- `shared-kernel` MUST NOT be used as a generic duplication-removal directory.
- Prefer duplication over a premature shared kernel when the shared concept is unstable or context-specific.
- Prefer shared kernel for small, stable domain concepts such as `Money`, `Currency`, or `DateRange`.
- Do not create shared-kernel code until multiple bounded contexts intentionally share a stable domain concept.

## Domain Model Building Blocks

- Aggregates protect consistency boundaries and expose behavior through the aggregate root.
- Entities have identity and lifecycle.
- Value objects describe immutable domain values and validate their own invariants.
- When repositories belong to the domain layer, they represent domain persistence needs as contracts, not database implementation details.
- Domain services contain business rules that do not naturally belong to one entity or value object.
- Domain events describe meaningful business facts that already happened.
- Domain errors describe business rule failures and should not contain transport, database, or framework details.

## Review Rules

- Check whether a new shared abstraction is really a stable domain concept before making it shared domain code.
- Check whether a bounded context's public language is leaking another context's internal model.
- Check whether a domain object is expressing business behavior instead of acting as a database row or request DTO.
- Check whether communication across model boundaries uses IDs, DTOs, events, ports, or anti-corruption mapping.
