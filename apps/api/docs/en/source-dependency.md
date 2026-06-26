---
title: API Source Dependency Convention
lang: en
audience: both
applies_to:
  - apps/api
translation: ../ko/source-dependency.md
related:
  - ./architecture.md
  - ./error.md
  - ./runtime-wiring.md
---

# API Source Dependency Convention

Source dependency rules decide what a source file may import.
Dependency direction MUST remain consistent from outer layers toward inner layers.

## Visual Dependency Map

Read every arrow as "the source may import the target."
If a dependency is not shown here and is not explicitly allowed in this document, treat it as forbidden by default.

```mermaid
flowchart TB
  subgraph adapters[Outer Adapters]
    direction LR
    presentation[Presentation]
    infrastructure[Infrastructure]
  end

  application[Application]
  domain[Domain]
  core[Core]

  subgraph kernels[Kernels]
    direction TB
    presentationKernel[Presentation Kernel]
    infrastructureKernel[Infrastructure Kernel]
    applicationKernel[Application Kernel]
    domainKernel[Domain Kernel]
  end

  presentation --> application
  infrastructure --> application
  application --> domain
  domain --> core

  presentation --> presentationKernel
  infrastructure --> infrastructureKernel
  application --> applicationKernel
  domain --> domainKernel
  presentationKernel --> core
  infrastructureKernel --> core
  applicationKernel --> core
  domainKernel --> core
```

The primary source direction is:

```text
presentation -> application -> domain -> core
infrastructure -> application -> domain -> core
```

## Forbidden Shortcuts

```text
domain -/-> application
domain -/-> infrastructure
domain -/-> presentation
domain -/-> platform
application core -/-> infrastructure implementations
application core -/-> presentation DTOs
application core -/-> framework decorators
application core -/-> framework DI APIs
application core -/-> platform concrete types
```

## Source Direction

- `core` does not depend on any project layer.
- Kernel directories may depend on `core`.
- `domain` may depend on `core` and `kernels/domain`.
- `application` may depend on `core`, `domain`, and `kernels/application`.
- `infrastructure` may depend on `core`, `domain`, `application`, `kernels/infrastructure`, and external libraries when implementing adapters.
- `presentation` may depend on `core`, `application`, `kernels/presentation`, and framework libraries when handling external protocols.
- A bounded context root wiring module MAY depend on that context's application, presentation, and infrastructure code to compose the feature.
- Production code outside `platform` MUST NOT import `platform`, except the thin `src/main.ts` entrypoint.
- Domain code MUST NOT import `platform`, NestJS, database, HTTP, SDK, infrastructure, presentation, or application code.
- Application core MUST NOT import infrastructure implementations, presentation DTOs, framework decorators, framework DI APIs, or platform concrete types.

## Import Path Policy

- Project path aliases are declared only in [`apps/api/tsconfig.json`](../../tsconfig.json).
- TypeScript, Vitest, and static analysis tools should consume `tsconfig.json` instead of redefining project alias meaning.
- Path aliases represent stable architectural boundaries, not general path-shortening conveniences.
- Keep aliases limited to named source boundaries such as `@core/*`, `@kernels/*`, `@contexts/*`, and `@platform/*`.
- Do not add broad aliases such as `@api/*`, `@src/*`, or `@/*`.
- When aliases exist for source boundaries, production `src` imports should use them when crossing those boundaries.
- Prefer relative imports inside the same local implementation area.
- Use `index.ts` files as public surfaces for intentionally exported contracts, not as default folder decoration.
- Cross-boundary imports SHOULD target a public surface when one exists.
- Production imports into kernel directories, context domain code, and application ports should use their public surfaces.
- Avoid deep imports into another context or layer internals unless this document explicitly allows the dependency.

## Core

- `core` contains pure primitives that have no layer, framework, bounded context, or business vocabulary.
- Examples include `Result`, `Option`, `BaseError`, `assertNever`, and generic guards.
- Any layer MAY depend on `core`.
- `core` MUST NOT depend on project layers, frameworks, external SDKs, or business concepts.

## Domain Layer

- The domain layer contains business rules and domain models.
- Use it for entities, value objects, aggregates, domain services, domain events, and domain errors.
- Domain code MUST NOT know application, infrastructure, presentation, framework, database, HTTP, or SDK details.
- Domain code SHOULD express pure business behavior and invariants.
- Domain code may depend on `core` and `kernels/domain`.

## Application Layer

- The application layer expresses use cases and application flow.
- Use it for commands, queries, use case handlers, application services, application-owned port interfaces, transaction boundaries, and application errors.
- Application core means use case flow and contracts, not NestJS module or provider registration.
- Application code uses domain models to execute user intent.
- Application code MUST NOT know infrastructure implementation details.
- Application code MUST NOT know presentation request or response DTO shapes.
- Application core MUST NOT depend on framework decorators or framework DI APIs.
- NestJS module files for application use case wiring belong at the bounded context root when they are needed, not under `contexts/{context-name}/application`.
- Application code SHOULD pass through same-context domain errors unchanged by default.
- Application code SHOULD pass through application-owned port failures unchanged when the port error is already the contract the caller can handle.
- Application code MAY convert application-owned port failures into application or use case errors when it intentionally adds distinct orchestration or caller-facing meaning.
- Application-owned unit-of-work port files SHOULD use the `*.uow.ts` suffix, such as `source-sync.uow.ts`.
- Application core may depend on `core`, domain code, and `kernels/application`.

## Infrastructure Layer

- The infrastructure layer implements technical adapters.
- Use it for database, ORM, external API, file system, message broker, SDK, and persistence code.
- Infrastructure code implements application-owned ports or domain/application contracts.
- Adapter code converts technology-specific errors, such as Prisma, TypeORM, HTTP client, SDK, or Drizzle errors, into port or infrastructure errors.
- Infrastructure code MAY depend on frameworks and external libraries.
- Infrastructure code does not need to know presentation code.

## Presentation Layer

- The presentation layer is the entry point for external requests and responses.
- Use it for controllers, resolvers, request DTOs, response DTOs, protocol mappers, and HTTP error mappers.
- Presentation code calls application use cases.
- Presentation code converts application errors into protocol responses and applies masking policy.
- Presentation code SHOULD NOT expose domain or infrastructure errors directly to clients.
- Presentation code MAY depend on frameworks and protocol libraries.

## Kernel Directories

- `kernels/domain` contains common domain-layer policy and stable domain concepts intentionally shared by multiple bounded contexts.
- `kernels/application` contains common application-layer contracts only.
- `kernels/infrastructure` contains common infrastructure adapter policy only.
- `kernels/presentation` contains common presentation-layer policy only.
- Kernel directories MAY depend on `core`.
- Kernel directories MUST NOT depend on bounded contexts, platform code, framework code, or outer layers.
- Kernel directories MUST NOT become generic utility buckets.
- Feature-specific policy belongs inside the owning bounded context.
