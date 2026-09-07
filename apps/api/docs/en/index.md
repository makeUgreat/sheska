---
title: API Convention Index
lang: en
audience: both
applies_to:
  - apps/api
translation: ../ko/index.md
related:
  - ./operability/error.md
  - ./operability/logging.md
  - ./architecture/architecture.md
  - ./architecture/ddd.md
  - ./persistence/persistence.md
  - ./architecture/infrastructure.md
  - ./architecture/source-dependency.md
  - ./architecture/runtime-wiring.md
  - ./architecture/context-integration.md
  - ./test.md
  - ./persistence/repository-methods.md
  - ./operability/observability.md
  - ./operability/fault-tolerance/index.md
---

# API Convention Index

## Synchronization Policy

- English and Korean `apps/api` convention documents are paired documents that should describe the same policy. When they conflict, choose the intended policy from either language and update both documents in the same change unit.

## Reading Rules

- Read only the `apps/api` convention documents relevant to the current task. When changing public project Markdown documents, also read the repository documentation convention index.

## Routing

### Architecture

- `apps/api` architecture, DDD boundary, source structure, or module boundary decisions: read [API Architecture Convention](./architecture/architecture.md).
- `apps/api` DDD boundaries, domain model ownership, or shared domain language: read [API DDD Convention](./architecture/ddd.md).
- Infrastructure adapter file naming, directory structure, or adapter conventions: read [API Infrastructure Convention](./architecture/infrastructure.md).
- Import direction, layer boundaries, or framework imports: read [API Source Dependency Convention](./architecture/source-dependency.md).
- NestJS DI, provider registration, module wiring, platform startup flow, or port binding: read [API Runtime Wiring Convention](./architecture/runtime-wiring.md).
- Cross-context data integration, consumer-owned port or adapter placement, or Pull vs Push strategy decisions: read [API Context Integration Convention](./architecture/context-integration.md).

### Operability

- API error, exception, masking, propagation, or error response contract reviews: read [API Error Policy](./operability/error.md).
- Logging decisions, log levels, where to log, or fault log policy: read [API Logging Policy](./operability/logging.md).
- OpenTelemetry instrumentation, trace/log/metric export wiring, or resource attribute decisions: read [API Observability Convention](./operability/observability.md).
- Retry, timeout/deadline, circuit breaker, or other fault-tolerance policy decisions for external dependencies: read [API Fault Tolerance Index](./operability/fault-tolerance/index.md).

### Persistence

- Database schema, migration, ORM persistence, repository mapper, or storage constraint decisions: read [API Persistence Policy](./persistence/persistence.md).
- Repository method call-site decisions (`get` vs `find`, `save` vs `insert`/`update`): read [Repository Method Usage Guide](./persistence/repository-methods.md).

### Test

- `apps/api` test files, test structure, or test command selection: read [API Test Convention](./test.md).
