---
title: UI Convention Index
lang: en
audience: both
applies_to:
  - apps/ui
translation: ../ko/index.md
related:
  - ./ui-style.md
  - ./visual-regression.md
  - ./test.md
  - ./deployment.md
---

# UI Convention Index

## Synchronization Policy

English and Korean `apps/ui` convention documents are paired documents that should describe the same policy.
When they conflict, choose the intended policy from either language and update both documents in the same change unit.

## Reading Rules

Read only the `apps/ui` convention documents relevant to the current task.
When changing public project Markdown documents, also read the repository documentation convention index.

## Routing

- `apps/ui` visual design, CSS structure, design tokens, typography, colors, spacing, or component styling decisions: read [UI Style Convention](./ui-style.md).
- Playwright screenshot, pixel-diff, Stitch visual fidelity, visual baseline, or browser-rendered design regression decisions for `apps/ui`: read [UI Visual Regression Convention](./visual-regression.md).
- `apps/ui` test files, test structure, or test command selection: read [UI Test Convention](./test.md).
- Dockerfile, Cloudflare Pages config, or vite build settings: read [UI Deployment](./deployment.md).
