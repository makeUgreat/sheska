---
title: API Source Dependency Convention
lang: en
audience: both
applies_to:
  - apps/api
translation: ../ko/source-dependency.md
related:
  - ./architecture.md
  - ./runtime-wiring.md
---

# API Source Dependency Convention

Source dependency rules decide what a source file may import.
Runtime wiring MAY connect objects more flexibly, but it MUST NOT weaken source dependency rules.

## Source Direction

The default source direction inside each `src/{module}/` implementation module is:

```text
presentation -> application -> domain
infrastructure -> application -> domain
```

- Domain code does not depend on application, infrastructure, presentation, bootstrap, NestJS, database, HTTP, SDK, or other framework details.
- Application code may depend on domain code.
- Presentation code may depend on application code and protocol/framework libraries.
- Infrastructure code may depend on application contracts, domain code, external libraries, and framework libraries when implementing adapters.
- `api.module.ts` and implementation modules MAY depend on application, presentation, and infrastructure code to compose runtime providers.

Cross-module source imports SHOULD prefer application-level contracts or use cases.
Do not import another module's domain objects only to reuse internal state or validation.
When two modules need the same domain language, reconsider whether the behavior belongs in one module before extracting shared code.

## Framework Dependency Policy

- Domain code MUST NOT import NestJS decorators, NestJS DI APIs, transport DTOs, persistence clients, or external SDK clients.
- Application code SHOULD keep use case flow and contracts understandable without framework knowledge.
- Application code MAY use NestJS decorators or DI when avoiding them would add more indirection than value.
- Presentation and infrastructure code MAY use NestJS and protocol or adapter libraries directly.
- Do not introduce a forbidden domain dependency only to make NestJS provider registration easier.

## Import Path Policy

- Prefer relative imports inside the same local implementation area.
- Do not add `index.ts` barrel files by default.
- Prefer direct imports from concrete files inside the same app.
- Use an `index.ts` only when a directory is intentionally maintained as a stable public API boundary.
- Do not use `index.ts` only to shorten import paths.
- Avoid broad aliases such as `@api/*`, `@src/*`, or `@/*`.
- Do not add path aliases only to shorten nearby relative imports.

## Layer Responsibilities

- `src/{module}/domain` contains entities, value objects, aggregates, domain services, domain events, domain errors, and business invariants.
- `src/{module}/application` contains use cases, application services, command/query handlers, application errors, transaction boundaries, and application-owned ports when needed.
- `src/{module}/infrastructure` contains database, ORM, external API, file system, message broker, SDK, and persistence adapter code.
- `src/{module}/presentation` contains controllers, resolvers, request DTOs, response DTOs, protocol mappers, guards, pipes, and HTTP error mapping.
- Shared kernel is not part of the current API structure.

## Review Rules

- Check that domain code stays free of framework and adapter details.
- Check that application code does not depend on presentation DTOs or infrastructure implementations.
- Check that shared abstractions are stable boundaries, not general utility buckets.
