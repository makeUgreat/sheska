# Project Conventions

Use convention indexes as the entry points for project conventions.
Convention documents are written in Korean only; do not create English counterparts.

- [Root Convention Index](docs/ko/index.md)

## App Conventions

Read the app-specific conventions before changing code or docs in that app.

- API: [API Convention Index](apps/api/docs/ko/index.md)
- UI: [UI Convention Index](apps/ui/docs/ko/index.md)
- E2E: [E2E Test Conventions](e2e/docs/ko/test.md)
- Obsidian plugin: when changing code that calls the API (`apps/obsidian-plugin/src/api`), read [API HTTP Contract](apps/api/docs/ko/architecture/http-contract.md).

## Dev Integrations

- Credentials for dev tools (PostgreSQL, Redis and Obsidian MCP, Obsidian Local REST API) live in the gitignored `.dev-integrations.env`. Copy `.dev-integrations.env.example` to start.
- The home k3s cluster is documented in `~/WebstormProjects/hash-infra/CLAUDE.md`. kubectl needs the SSH tunnel described there, which you can open yourself.
