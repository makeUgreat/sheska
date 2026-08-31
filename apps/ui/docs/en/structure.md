---
title: UI Structure Convention
lang: en
audience: both
applies_to:
  - apps/ui
translation: ../ko/structure.md
related:
  - ./index.md
  - ./test.md
---

# UI Structure Convention

## Scope

Use this document when creating, moving, or reviewing `apps/ui` source directories, feature boundaries, import direction, or reusable UI placement.

The UI app follows strict Feature-Sliced Design so code location stays predictable and dependencies flow in one direction.

## Layer Model

Use these top-level source layers:

```txt
src/
  01_app/
  02_pages/
  03_widgets/
  04_features/
  05_entities/
  06_shared/
  styles/
```

The numeric prefixes keep filesystem and IDE listings in FSD layer order. Public
imports still use the unprefixed FSD layer names, such as `@/pages/posts`,
`@/widgets/posts-archive`, and `@/shared/ui`.

Dependencies point downward only:

```txt
app -> pages -> widgets -> features -> entities -> shared
```

`app` owns application bootstrap and shell wiring such as router setup and providers.

`pages` owns route-level composition. Page slices should compose lower layers and avoid owning reusable domain behavior.

`widgets` owns complete UI blocks that combine features, entities, and shared UI.

`features` owns user interactions and workflow state, such as archive search state, post title updates, or source publishing.

`entities` owns domain contracts, API clients, query hooks, and minimal reusable entity UI.

`shared` owns domain-free primitives, API infrastructure, hooks, helpers, and configuration.

`styles` owns global styles, generated theme CSS, and design-token artifacts.

## Slices And Segments

Every layer except `app` and `shared` is split into slices by business concept or route concept. Slices in the same layer MUST NOT import each other; shared needs should move to a lower layer.

Slices expose a public API from their root `index.ts`. Production code outside the slice MUST import through that public API, for example `@/entities/post` or `@/widgets/posts-archive`, not through `api/`, `ui/`, or `model/` internals.

Use these standard segments inside slices:

- `ui`: components and presentation code.
- `model`: state, hooks, selectors, schemas, and workflow logic.
- `api`: backend calls, query hooks, DTOs, and mappers.
- `lib`: slice-local helpers.
- `config`: slice-local configuration.

`app` and `shared` have segments directly under the layer instead of slices. Use segment public APIs such as `@/app/shell`, `@/shared/ui`, `@/shared/api`, and `@/shared/lib`; do not add layer-root barrels such as `@/features` or `@/app`.

## Static Enforcement

ESLint enforces production `src` FSD boundaries:

- no upward layer imports;
- no direct imports between slices in the same layer;
- no cross-slice imports into another slice's internal segment.

Specs, stories, and `test/**` may import the unit they directly verify or document. The static rule itself is covered by `pnpm test:static` and included in `pnpm harness:static`.

## Review Checks

- New reusable domain UI belongs in an entity or widget slice, not in a page.
- New user interaction state belongs in a feature slice.
- New route composition belongs in a page slice.
- New domain-free primitive code belongs in `shared`.
- Public API exports should stay narrow and intentional.
