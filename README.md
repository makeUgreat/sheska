# Sheska

Sheska is organized as a pnpm monorepo.

## Workspaces

- `apps/api`: NestJS API
- `apps/ui`: UI package placeholder

## Setup

```bash
pnpm install
```

## API

Run the API in development mode:

```bash
pnpm start:dev
```

Build the API:

```bash
pnpm build
```

Run type checking:

```bash
pnpm typecheck
```

Run tests:

```bash
pnpm test
pnpm test:unit
pnpm test:integration
```

Run package commands directly:

```bash
pnpm --filter @sheska/api start:dev
pnpm --filter @sheska/api build
pnpm --filter @sheska/api typecheck
pnpm --filter @sheska/api test
```

## Documentation

- Repository documentation conventions: `docs/en/index.md`, `docs/ko/index.md`
- Planning document: `plans/README.md`
- API conventions: `apps/api/docs/en/index.md`, `apps/api/docs/ko/index.md`
