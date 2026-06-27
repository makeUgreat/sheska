# Sheska

Sheska는 pnpm monorepo로 구성되어 있다.

## Workspaces

- `apps/api`: NestJS API
- `apps/ui`: UI package placeholder

## Setup

```bash
pnpm install
```

## API

API를 development mode로 실행한다.

```bash
pnpm start:dev
```

API를 build한다.

```bash
pnpm build
```

Type checking을 실행한다.

```bash
pnpm typecheck
```

테스트를 실행한다.

```bash
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:integration:postgres
pnpm test:integration:all
```

Package command를 직접 실행한다.

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
