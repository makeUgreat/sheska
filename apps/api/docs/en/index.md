---
title: API Convention Index
lang: en
audience: both
applies_to:
  - apps/api
translation: ../ko/index.md
related:
  - ./error.md
  - ./architecture.md
  - ./ddd.md
  - ./persistence.md
  - ./infrastructure.md
  - ./source-dependency.md
  - ./runtime-wiring.md
  - ./test.md
---

# API Convention Index

## Synchronization Policy

English and Korean `apps/api` convention documents are paired documents that should describe the same policy.
When they conflict, choose the intended policy from either language and update both documents in the same change unit.

## Reading Rules

Read only the `apps/api` convention documents relevant to the current task.
When changing public project Markdown documents, also read the repository documentation convention index.

## Routing

- API error, exception, masking, propagation, or error response contract reviews: read [API Error Policy](./error.md).
- `apps/api` architecture, DDD boundary, source structure, or module boundary decisions: read [API Architecture Convention](./architecture.md).
- `apps/api` DDD boundaries, domain model ownership, or shared domain language: read [API DDD Convention](./ddd.md).
- Database schema, migration, ORM persistence, repository mapper, or storage constraint decisions: read [API Persistence Policy](./persistence.md).
- Infrastructure adapter file naming, directory structure, or adapter conventions: read [API Infrastructure Convention](./infrastructure.md).
- Import direction, layer boundaries, or framework imports: read [API Source Dependency Convention](./source-dependency.md).
- NestJS DI, provider registration, module wiring, platform startup flow, or port binding: read [API Runtime Wiring Convention](./runtime-wiring.md).
- `apps/api` test files, test structure, or test command selection: read [API Test Convention](./test.md).
