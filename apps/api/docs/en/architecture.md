---
title: API Architecture Convention
lang: en
audience: both
applies_to:
  - apps/api
translation: ../ko/architecture.md
related:
  - ./ddd.md
  - ./source-dependency.md
  - ./runtime-wiring.md
---

# API Architecture Convention

This API has one bounded context inside one deployable API.
Implementation modules organize code inside that context.
Layer boundaries organize code inside each module.

API architecture is described across three dimensions:

- The API bounded context defines where the model, language, and responsibility are valid.
- Implementation modules group code by business capability or runtime ownership.
- Dependency and wiring boundaries define which code may import, compose, or call other code.

## Related Documents

- [API DDD Convention](./ddd.md): the API bounded context, implementation modules, and domain model rules.
- [API Source Dependency Convention](./source-dependency.md): import direction, layer boundaries, and framework dependency rules.
- [API Runtime Wiring Convention](./runtime-wiring.md): NestJS DI, module composition, provider registration, and port binding rules.

## Source Structure

The API source map is module-first:

```text
src/
  main.ts
  api.module.ts
  {module}/
    {module}.module.ts
    domain/
    application/
    infrastructure/
    presentation/
```

Use a concrete module name in place of `{module}`.
Each module directory is an implementation module, not a separate bounded context.
Subdirectories inside each module layer may differ by feature, adapter type, or framework need.

Create a layer directory only when that module has code that belongs in the layer.
Do not add empty layer folders only to complete the shape.

## Architecture Defaults

- Treat the API as one bounded context.
- Do not create `contexts/` or `shared-kernel/` in the current API structure.
- Group source files under `src/{module}/` before grouping by layer.
- Use one deployable API.
- Keep domain code independent from NestJS, transport, persistence, and external SDK details.
- Allow NestJS module and provider wiring in API bootstrap code, `api.module.ts`, and implementation modules.
- Allow NestJS decorators and DI in presentation, infrastructure, and pragmatic application services when they reduce local complexity.
- Do not use framework convenience to make domain objects depend on framework APIs.

## Directory Reading Rules

- Identify the dependency boundary: domain, application, infrastructure, presentation, or runtime wiring.
- Do not read a `src/{module}/` directory as a bounded context only because it groups source files or has a NestJS module.
- Use the source dependency rules for import direction.
- Use the runtime wiring rules for provider composition and object creation.
