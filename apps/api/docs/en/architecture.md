---
title: API Architecture Convention
lang: en
audience: both
applies_to:
  - apps/api
translation: ../ko/architecture.md
related:
  - ./error.md
  - ./ddd.md
  - ./persistence.md
  - ./source-dependency.md
  - ./runtime-wiring.md
---

# API Architecture Convention

This document is the API architecture map; use the linked documents for detailed rules.

## Scope

- Use this document when deciding the high-level source area for API code.
- This document names architectural boundaries and routes to detailed policy documents. It does not replace the DDD, source dependency, runtime wiring, persistence, or error policies.

## Architecture Axes

API architecture is described across two axes:

- DDD model boundaries define where a model, language, and responsibility are valid.
- Dependency and layer boundaries define which code may depend on which other code.

Read the error policy when defining, transforming, masking, or exposing application errors, exceptions, protocol error responses, or system errors.

## Related Documents

- [API Error Policy](./error.md): application error meaning, categories, transformation, response structure, and unexpected system error handling.
- [API DDD Convention](./ddd.md): bounded contexts, implementation modules, domain kernel, and domain model rules.
- [API Persistence Policy](./persistence.md): database schema, migration, ORM persistence, repository mapper, and storage constraint rules.
- [API Source Dependency Convention](./source-dependency.md): import direction, layer boundaries, and framework import rules.
- [API Runtime Wiring Convention](./runtime-wiring.md): NestJS DI, provider registration, platform runtime, and port binding rules.

## Source Boundaries

The high-level API source boundaries are:

```text
src/
  main.ts
  core/
  kernels/
    domain/
    application/
    infrastructure/
    presentation/
  platform/
    nest/
  contexts/
    {context-name}/
      domain/
      application/
      infrastructure/
      presentation/
```

This map names architectural boundaries, not a complete folder contract.
Create lower-level directories and layer folders only when code needs them.
Subdirectories inside context layers, `platform/nest`, and `kernels` may differ by feature, adapter type, or framework need.

## Directory Reading Rules

- First decide whether code belongs to a bounded context, kernel, core, or platform.
- Use the DDD, source dependency, and runtime wiring documents for detailed placement, import, and wiring rules.
