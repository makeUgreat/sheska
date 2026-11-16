# Project Conventions

Use convention indexes as the entry points for project conventions.
Convention documents are written in Korean only; do not create English counterparts.

- [Root Convention Index](docs/ko/index.md)

## App Conventions

Read the app-specific conventions before changing code or docs in that app. Read only the documents whose topic matches the task.

- API (`apps/api/docs/ko/`):
  - [Context map](apps/api/docs/ko/architecture/context-map.md): which bounded context owns a concept, and the dependency direction between contexts
  - [Domain model](apps/api/docs/ko/architecture/ddd.md): context naming, aggregates, encapsulation, domain method input types
  - [Context integration](apps/api/docs/ko/architecture/context-integration.md): events, outbox, cross-context ports and ACL
  - [Source dependency](apps/api/docs/ko/architecture/source-dependency.md): where code goes, import direction, public surface, kernels
  - [Runtime wiring](apps/api/docs/ko/architecture/runtime-wiring.md): NestJS modules and DI, config bundles, secrets
  - [HTTP contract](apps/api/docs/ko/architecture/http-contract.md): endpoints, request/response shapes, error codes
  - [Persistence](apps/api/docs/ko/persistence/persistence.md): schema, constraints, mappers, repository and query port methods
  - [Errors and logging](apps/api/docs/ko/operability/error.md), [Fault tolerance](apps/api/docs/ko/operability/fault-tolerance.md), [Observability](apps/api/docs/ko/operability/observability.md)
  - [Tests](apps/api/docs/ko/test.md)
- UI: [UI Convention Index](apps/ui/docs/ko/index.md)
- E2E: [E2E Test Conventions](e2e/docs/ko/test.md)
- Obsidian plugin: when changing code that calls the API (`apps/obsidian-plugin/src/api`), read [API HTTP Contract](apps/api/docs/ko/architecture/http-contract.md).

## Dev Integrations

- Credentials for dev tools (PostgreSQL, Redis and Obsidian MCP, Obsidian Local REST API) live in the gitignored `.dev-integrations.env`. Copy `.dev-integrations.env.example` to start.
- The home k3s cluster is documented in `~/WebstormProjects/hash-infra/CLAUDE.md`. kubectl needs the SSH tunnel described there, which you can open yourself.
