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

The UI app follows a light Feature-Sliced Design direction. The structure should make ownership and dependency direction clear without forcing every FSD layer or segment before the code needs it.

## Layer Model

Prefer these top-level source areas as the app grows:

```txt
src/
  app/
  pages/
  features/
  entities/
  shared/
  styles/
```

`app` owns bootstrap wiring such as providers, router setup, and application shell composition.

`pages` owns route-level composition. Pages may compose features, entities, and shared UI, but should avoid owning reusable domain behavior.

`features` owns user-facing domain behavior, such as a posts archive, posts search, publishing flow, or source synchronization flow.

`entities` owns domain objects and their reusable contracts, API query hooks, mappers, and small entity UI when those pieces are shared by multiple features or pages.

`shared` owns domain-free building blocks such as primitive UI, generic hooks, formatting helpers, HTTP infrastructure, and test utilities.

`styles` owns global styles, generated theme CSS, and design-token artifacts.

## Light FSD Policy

Do not create empty FSD folders only to satisfy the pattern.

Prefer moving code into `features`, `entities`, or `shared` when there is a real ownership boundary:

- A hook or component tied to one user workflow belongs under that feature.
- A hook, helper, or UI primitive that has no domain knowledge belongs under `shared`.
- Domain contracts or reusable domain-specific query hooks belong under `entities` once multiple features or pages need them.
- Route files belong under `pages` and should primarily compose lower layers.

Small features may keep `components/`, `hooks/`, or `api/` names instead of forcing `ui/`, `model/`, and `api/` segments immediately. Introduce FSD segment names when they reduce ambiguity for that slice.

## Import Direction

Dependencies should point downward:

```txt
app -> pages -> features -> entities -> shared
```

A lower layer must not import an upper layer. For example, `shared` must not import `features` or `pages`, and `features` must not import `pages` or `app`.

The ESLint configuration enforces the most important layer direction rules for new FSD directories. Keep the documentation and lint rules aligned when the structure changes.

## Migration Guidance

Prefer incremental moves that preserve behavior and keep reviews small.

Good first moves are:

```txt
src/hooks/use-debounced-value.ts
-> src/shared/hooks/use-debounced-value.ts

src/components/ui/*
-> src/shared/ui/*

src/hooks/use-posts-archive.ts
src/hooks/use-infinite-posts-scroll.ts
src/components/post/*
-> src/features/posts/*
```

When moving files, update imports and nearby tests in the same change. Do not combine structural migration with unrelated behavior changes unless the behavior change is required to preserve the move.
