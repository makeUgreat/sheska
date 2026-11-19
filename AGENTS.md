# Project Conventions

Convention documents are written in Korean only; do not create English counterparts.
Read only the documents whose topic matches the task.
Before adding or changing a convention document (`docs/ko/`, `apps/*/docs/ko/`, or this file), show the proposed text to the user and get confirmation.

## Repository

- Domain terms and rules: [Glossary](docs/ko/domain/glossary.md), [Library](docs/ko/domain/library.md) (source sync, sync jobs, posts, search, body syntax), [Ingestion](docs/ko/domain/ingestion.md) (chunks, embedding models, embedding storage)
- Writing or reviewing any document: [Writing guide](docs/ko/documentation-guidelines.md)
- Workspaces, root scripts, static harness: [Monorepo](docs/ko/monorepo.md)
- Environment variables, env files, secrets, per-environment behavior, migrations: [Environments](docs/ko/environments.md)
- Writing tests, choosing a test layer, cross-workspace test runtimes: [Testing](docs/ko/testing.md)
- Code shape (blank lines in function bodies, branch order and conditions): [Code style](docs/ko/code-style.md)

## API (`apps/api/docs/ko/`)

- [Context map](apps/api/docs/ko/architecture/context-map.md): which bounded context owns a concept, and the dependency direction between contexts
- [Domain model](apps/api/docs/ko/architecture/ddd.md): context naming, aggregates, encapsulation, domain method input types
- [Context integration](apps/api/docs/ko/architecture/context-integration.md): events, outbox, cross-context ports and ACL
- [Source dependency](apps/api/docs/ko/architecture/source-dependency.md): where code goes, import direction, public surface, kernels
- [Runtime wiring](apps/api/docs/ko/architecture/runtime-wiring.md): NestJS modules and DI, config bundles, secrets
- [HTTP contract](apps/api/docs/ko/architecture/http-contract.md): endpoints, request/response shapes, error codes. Also read it when UI or Obsidian plugin code calls the API.
- [Persistence](apps/api/docs/ko/persistence/persistence.md): schema, constraints, mappers, repository and query port methods
- [Errors and logging](apps/api/docs/ko/operability/error.md), [Fault tolerance](apps/api/docs/ko/operability/fault-tolerance.md), [Observability](apps/api/docs/ko/operability/observability.md)

## UI (`apps/ui/docs/ko/`)

- [Structure](apps/ui/docs/ko/structure.md): FSD layers and slices, markdown body rendering
- [Design](apps/ui/docs/ko/design.md): color, type, spacing, code fences, effects, table of contents, responsive layout, overflow

## Dev Integrations

- Credentials for dev tools (PostgreSQL, Redis and Obsidian MCP, Obsidian Local REST API) live in the gitignored `.dev-integrations.env`. Copy `.dev-integrations.env.example` to start.
- The home k3s cluster is documented in `~/WebstormProjects/hash-infra/CLAUDE.md`. kubectl needs the SSH tunnel described there, which you can open yourself.
