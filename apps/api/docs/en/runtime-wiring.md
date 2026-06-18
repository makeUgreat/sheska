---
title: API Runtime Wiring Convention
lang: en
audience: both
applies_to:
  - apps/api
translation: ../ko/runtime-wiring.md
related:
  - ./architecture.md
  - ./source-dependency.md
---

# API Runtime Wiring Convention

Runtime wiring rules decide where objects are created and how implementations are connected.
Runtime wiring describes module composition and provider binding, not source import permission.

## Wiring Boundaries

- Keep `src/main.ts` as a thin process entrypoint.
- `api.module.ts` is the API root module.
- `api.module.ts` MAY compose application, presentation, and infrastructure providers.
- `src/{module}/{module}.module.ts` files are optional runtime wiring modules, not bounded contexts.
- Prefer composing providers by runtime boundary or feature instead of mirroring every use case folder as a NestJS module.

## NestJS DI

- NestJS DI MAY be used for runtime wiring in root modules, implementation modules, presentation adapters, infrastructure adapters, and pragmatic application services.
- NestJS DI MUST NOT create a source dependency from domain code to NestJS.
- Use provider factories or explicit providers when an outer implementation must satisfy an inner contract.
- Do not move business rules into NestJS modules, provider factories, or bootstrap functions.
- Keep provider registration close to the runtime boundary that owns the choice.

## Port Binding

- In this convention, a port means an application-owned boundary contract when an outer implementation must be swapped, isolated, or tested through a stable interface.
- Do not create a port for every dependency by default.
- Runtime wiring MAY connect an infrastructure implementation to an application port without making application code import that implementation.
- Infrastructure adapters may implement application-owned ports.
- Presentation DTOs, domain errors, application errors, and persistence mappers are contracts, but they are not ports by default.

## Configuration

- Environment variable definitions belong near the boundary that uses them.
- Runtime wiring MAY aggregate environment selection and app-level validation at startup.
- Adapter-specific required environment variables SHOULD be validated by the selected adapter or its config factory.
- Production code SHOULD consume validated config values instead of reading `process.env` in scattered locations.

## Review Rules

- Check that runtime wiring does not introduce forbidden source imports.
- Check that NestJS modules compose behavior rather than contain business rules.
- Check that ports are introduced only where substitution, isolation, or boundary clarity is useful.
- Check that configuration ownership follows the runtime boundary that uses the value.
