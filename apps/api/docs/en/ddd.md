---
title: API DDD Convention
lang: en
audience: both
applies_to:
  - apps/api
translation: ../ko/ddd.md
related:
  - ./architecture.md
  - ./index.md
---

# API DDD Convention

DDD terms in this API are used to define model ownership, language boundaries, and business behavior.
They are not only folder names.

## API Bounded Context

- This API has one bounded context.
- Do not create additional bounded context folders.
- A NestJS module or feature folder is not automatically a bounded context.

## Bounded Context Definition

- A bounded context is the boundary where a specific domain model and ubiquitous language are valid.
- Code outside a bounded context MUST NOT directly modify the context's internal model.
- Code outside a bounded context SHOULD NOT depend on the context's internal domain objects.
- A bounded context is defined by model, language, and responsibility boundaries, not by a folder name alone.

## Implementation Modules

- An implementation module is a practical source grouping, code wiring, or framework module unit.
- Source files are grouped by implementation module under `src/{module}/`.
- An implementation module is not automatically a DDD bounded context.
- Implementation module names should describe business capability or runtime ownership inside the single API bounded context.

## Domain Model Building Blocks

- Aggregates protect consistency boundaries and expose behavior through the aggregate root.
- Entities have identity and lifecycle.
- Value objects describe immutable domain values and validate their own invariants.
- When repositories belong to the domain layer, they represent domain persistence needs as contracts, not database implementation details.
- Domain services contain business rules that do not naturally belong to one entity or value object.
- Domain events describe meaningful business facts that already happened.
- Domain errors describe business rule failures and should not contain transport, database, or framework details.

## Review Rules

- Check whether a domain object is expressing business behavior instead of acting as a database row or request DTO.
- Check whether `src/{module}/` implementation modules are being mistaken for domain model boundaries.
