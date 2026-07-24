---
title: Design System
lang: en
audience: both
applies_to:
  - apps/ui
translation: ../ko/design.md
related:
  - ./design-token.md
  - ./design-component.md
read_when: Changing or reviewing visual design, CSS structure, design tokens, typography, colors, spacing, or component styling
---

# Design System

## Source

`apps/ui` follows the active Stitch design system selected for the app.
Use Stitch as the source of truth for visual direction unless a future design task explicitly replaces it.

The current active Stitch source is:

- Project: `MacOS Terminal AI Blog`
- Project ID: `18218865311785006442`
- Project URL: `https://stitch.withgoogle.com/projects/18218865311785006442`
- Main page screen: `Main Blog Page (Ember & Ash Theme)`, screen ID `2311ec2a1a4c4a15ae5eedb5b64c0b03`
- Design system screen: `Design System`, screen ID `asset-stub-assets_275de50dde8e4051a9394169751633de`

When the Stitch project changes, use the latest user-provided Stitch Instructions for that project and screen as the authoritative access path.
Use the hosted URLs from Stitch Instructions directly and download them with `curl -L` when reference artifacts need to be refreshed.

When implementing from Stitch, preserve the intended tone of the selected design system rather than copying isolated visual details without context.
If the Stitch design system and local implementation drift, update the implementation or explicitly document the design-system change.

## Brand & Style

The brand identity centers on a high-precision, technical aesthetic that balances stark minimalism with a warm, editorial edge. It targets a sophisticated audience-developers, architects, and researchers-who value functional clarity and deep focus.

The design style is **Minimalist with a Technical Edge**, drawing inspiration from terminal environments and high-end print design. It utilizes heavy whitespace, intentional high contrast, and a single accent color to guide the eye without creating cognitive noise. The emotional response is one of calm authority, precision, and intellectual rigor. All green tones are strictly excluded to maintain a disciplined, monochrome-first palette.

## Design Tokens

See [Design Tokens](./design-token.md).

## Components

See [Design Components](./design-component.md).
