---
title: Design Tokens
lang: en
audience: both
applies_to:
  - apps/ui
translation: ../ko/design-token.md
related:
  - ./design.md
---

# Design Tokens

Design token values live in `src/styles/design-tokens.json` using the DTCG JSON format.
That JSON file is the implementation source of truth.

`src/styles/theme.css` is the generated Tailwind/CSS adapter for those tokens.
It exposes token values as Tailwind v4 `@theme` variables so the app can use token-backed utility classes.

Run `pnpm tokens:build` after changing `design-tokens.json`.
The command regenerates `theme.css` from the token source.

Run `pnpm tokens:check` when reviewing token changes or before committing.
The command fails if `theme.css` is out of sync with `design-tokens.json`.
Do not copy the full token value list into this document; keep token values in JSON and use this document for usage intent.

## File Roles

- `src/styles/design-tokens.json`: source token data for tools and cross-platform exchange.
- `src/styles/theme.css`: generated app-facing Tailwind v4 `@theme` adapter.
- `docs/en/design-token.md` and `docs/ko/design-token.md`: human-readable token intent and usage guidance.

## Colors

The palette pairs a light, editorial page base with dark, terminal-styled elevated surfaces, using a desaturated rose red as the sole vehicle for emphasis and interactivity.

- **Page Background**: `#ffffff` (`page-background`). The primary app background. Most pages sit directly on this light base.
- **Text-Primary**: `#101319` (`text-primary`). Near-black text on the light page background.
- **Text-Secondary**: `#43474f` (`text-secondary`). Muted gray for metadata and supportive text on the light background.
- **Surface family**: `#0b0e14`–`#32353b` (`surface`, `surface-container-lowest` through `surface-container-highest`). Deep charcoal tones reserved for dark, terminal-styled elevated components — the hero terminal window, cards, and tags — not the page background.
- **Accent**: `#e16d76` (`accent`). Used exclusively for primary actions, active states, and critical highlights, on both the light base and the dark elevated surfaces.
- **Border**: `#564242` (`outline-variant` / `border-subtle`). A cool, low-contrast border for subtle structural separation.

Avoid all green, blue, or yellow tones. Success states should be communicated through typography or iconography rather than color shifts to green.

## Typography

This design system uses a dual-font approach to emphasize its technical nature. **Geist** provides a clean, modern Sans-Serif foundation for all UI and prose, while **JetBrains Mono** is utilized for labels, tags, and data points to evoke a terminal-inspired precision.

Headlines should use tight tracking and bold weights to create a strong visual hierarchy against the minimal background. Body text is prioritized for legibility with generous line heights. Labels are always set in monospace and are frequently capitalized for a "metadata" feel.

## Layout & Spacing

The layout philosophy follows a **Fixed Grid** model on desktop and a **Fluid Grid** on mobile.

- **Desktop**: A 12-column grid with a maximum container width of 1280px. Gutters are fixed at 24px to provide clear separation of content blocks.
- **Mobile**: A 4-column fluid grid with 16px side margins.
- **Spacing Rhythm**: All margins and paddings must be multiples of the 4px base unit.

Use oversized margins (64px+) between major sections to emphasize the minimalist, editorial aesthetic. Content should feel "un-crowded" and intentional.

## Elevation & Depth

Depth is communicated through **Tonal Layers** and **Low-Contrast Outlines** rather than traditional shadows.

This tonal-layer model applies within the dark, terminal-styled elevated components, not to the light page base: objects closer to the user are lighter in tone, with the darkest surface (`surface-container-lowest`) sitting behind more elevated tones such as `surface-container-high`.

To define boundaries, use 1px solid borders in `#564242` (`outline-variant`). Avoid drop shadows entirely to maintain a flat, technical appearance. When an element is active or focused, the border or text color shifts to the primary Rose Red (`#e16d76`) to create a "glow-less" highlight.

## Effects & Motion

There are currently no custom effect or motion tokens. Hover and motion interactions copy Stitch's literal Tailwind utility classes directly instead of going through a token, for example:

- **Garden card hover**: `duration-300` background tint change on the card, no border or shadow change.
- **Action link hover**: `translate-x-1` on the trailing arrow only.
- **Text link hover**: plain color transition to the accent color.

Before adding a new effect or motion token, verify the exact class and value against the active Stitch project's exported code — do not introduce a token from an assumption, an old export, or a value that "feels right" for the brand. A token that cannot be pointed at a specific line in the current Stitch export must not claim Stitch as its source.

## Shapes

The shape language is disciplined and professional. We use **Soft** roundedness (0.25rem/4px) for small components like buttons and input fields. This provides a subtle hint of approachability without sacrificing the precision of a grid-based, rectangular layout. Larger containers like cards may use the `rounded-lg` (8px) token to further distinguish them from the background.
