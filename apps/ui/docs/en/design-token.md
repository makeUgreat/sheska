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

The palette is anchored by a deep charcoal and black foundation, using a desaturated rose red as the sole vehicle for emphasis and interactivity.

- **Primary**: `#e06c75` (Rose Red). Used exclusively for primary actions, active states, and critical highlights.
- **Surface**: `#1a1d23` (Deep Charcoal). The primary background color.
- **Surface-Elevated**: `#282c34`. Used for cards, modals, and navigation elements to create subtle depth.
- **Text-Primary**: `#ffffff`. High-contrast white for maximum readability.
- **Text-Secondary**: `#abb2bf`. A muted gray for metadata and supportive text.
- **Accent/Border**: `#3e4451`. A cool gray for subtle structural borders.

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

In this design system, objects closer to the user are lighter in tone. The base background is the darkest shade, while modals and floating cards use the secondary charcoal (`#282c34`).

To define boundaries, use 1px solid borders in `#3e4451`. Avoid drop shadows entirely to maintain a flat, technical appearance. When an element is active or focused, the border color shifts to the primary Rose Red (`#e06c75`) to create a "glow-less" highlight.

## Effects & Motion

There are currently no custom effect or motion tokens. Hover and motion interactions copy Stitch's literal Tailwind utility classes directly instead of going through a token, for example:

- **Garden card hover**: `duration-300` background tint change on the card, no border or shadow change.
- **Thumbnail hover**: `duration-500` `scale-105` on the image.
- **Action link hover**: `translate-x-1` on the trailing arrow only.
- **Text link hover**: plain color transition to the accent color.

Before adding a new effect or motion token, verify the exact class and value against the active Stitch project's exported code — do not introduce a token from an assumption, an old export, or a value that "feels right" for the brand. A token that cannot be pointed at a specific line in the current Stitch export must not claim Stitch as its source.

## Shapes

The shape language is disciplined and professional. We use **Soft** roundedness (0.25rem/4px) for small components like buttons and input fields. This provides a subtle hint of approachability without sacrificing the precision of a grid-based, rectangular layout. Larger containers like cards may use the `rounded-lg` (8px) token to further distinguish them from the background.
