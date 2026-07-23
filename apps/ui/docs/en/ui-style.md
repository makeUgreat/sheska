---
title: UI Style Convention
lang: en
audience: both
applies_to:
  - apps/ui
translation: ../ko/ui-style.md
read_when: Changing or reviewing visual design, CSS structure, design tokens, typography, colors, spacing, or component styling
---

# UI Style Convention

## Scope

This document defines the durable visual direction for `apps/ui`.
The current convention is intentionally small: preserve the selected design system and keep CSS decisions easy to revise as the product UI matures.

## Design System

`apps/ui` follows the active Stitch design system selected for the app.
Use Stitch as the source of truth for visual direction unless a future design task explicitly replaces it.
Keep the exported design-system source in `apps/ui/DESIGN.md` for implementation reference.

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

## Color

Use the active Stitch design system for palette decisions.
Do not introduce an unrelated accent or semantic color language without first deciding that the design system is changing.

Color choices should communicate hierarchy, state, and affordance consistently across routes.
When a color appears only because it was needed for a one-off implementation detail, keep that decision local instead of documenting it as policy.

## Typography

Use the active Stitch design system for typeface and type-scale decisions.
Typography should support the role of the content: headings establish hierarchy, prose stays readable, and technical metadata remains scannable.

Avoid adding new font families or type scales for isolated components unless the design system is being expanded intentionally.

## Layout And CSS

Use the active Stitch screen as the visual reference for the route it represents.
Do not promote a single screen's current layout details into app-wide rules until the same pattern is reused across multiple screens.

Prefer Tailwind utility classes for local component styling.
Use `src/index.css` for global concerns such as font imports, body defaults, and app-wide browser behavior.
Keep CSS structure simple until repeated styling decisions make an abstraction useful.

## Components

Components should remain compatible with the active design system even when no Stitch screen exists for that route.
For routes without a Stitch reference, keep the functional structure simple and reuse nearby established patterns.

Avoid inventing a separate visual language for an unsupported route just to fill the gap.
If a new pattern is likely to recur, reflect it back into Stitch or document it after it stabilizes.

## Design Verification

When a UI change is meant to implement a Stitch screen, compare the rendered app against the Stitch reference in a real browser.
This comparison should focus on the design intent that a user can perceive: layout hierarchy, spacing rhythm, typography, color treatment, major states, responsive behavior, and whether content remains readable without overlap.

Use exported Stitch artifacts, such as screenshots, generated code, or `DESIGN.md`, as implementation references.
Do not treat a passing `jsdom` test suite as evidence that the visual design matches Stitch.

For narrow styling changes, a focused browser check of the affected route is usually enough.
For page-level design work, check at least one desktop and one mobile-sized viewport, and include the compared routes or viewports in the PR or handoff notes.

## Review Checks

When reviewing UI changes, check that:

- The page still reads as the active Stitch design system.
- New colors, fonts, spacing, and component treatments are consistent with that system.
- New CSS is local by default, with global CSS reserved for app-wide behavior.
- Pages without Stitch references remain visually compatible without inventing a separate design language.
- Stitch-driven changes were checked in a real browser, not only through unit or integration tests.
