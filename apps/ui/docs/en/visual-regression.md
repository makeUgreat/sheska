---
title: UI Visual Regression Convention
lang: en
audience: both
applies_to:
  - apps/ui
translation: ../ko/visual-regression.md
related:
  - ./ui-style.md
  - ./test.md
read_when: Deciding, writing, reviewing, or updating Playwright screenshot, pixel-diff, Stitch visual fidelity, visual baseline, or browser-rendered design regression checks
---

# UI Visual Regression Convention

UI visual regression tests verify that browser-rendered UI remains visually aligned with the active Stitch design reference.
They are separate from the repository `e2e` workspace, which owns business-flow user journey tests.

## Scope

Use this document for Playwright-based screenshot or pixel-diff tests that validate visual fidelity, layout integrity, responsive rendering, and design effects.

Visual regression tests are in scope when a change needs confidence that:

- A route still matches the active Stitch screen's visual intent.
- A design-system token, font, spacing, color, animation, or responsive layout change did not visually regress.
- Content remains readable, aligned, and non-overlapping in real browser rendering.

Visual regression tests are out of scope for business behavior, domain correctness, API contracts, and multi-step user stories.
Those remain covered by `jsdom` UI tests, API tests, or the `e2e` workspace depending on the behavior.

## Ownership Boundary

`apps/ui` owns visual regression tests because they validate UI rendering and design fidelity.
The root `e2e` workspace owns complete user journeys through a running system.

Visual regression tests MAY use controlled fixtures or API interception to make screens deterministic.
This is different from business E2E tests: visual regression is not proving backend integration, so stable rendering data is more valuable than exercising the full system.

Do not move visual fidelity checks into the business E2E suite just because both use Playwright.
The two suites have different failure meanings, setup needs, and maintenance workflows.

## Reference Sources

Use Stitch exports as the primary reference for expected visuals:

- `DESIGN.md` for design-system tokens and style intent.
- Exported Stitch screenshots for screen-level comparison.
- Exported Stitch generated code when component structure or layout behavior needs clarification.

For the active Stitch project and screen IDs, use [UI Style Convention](./ui-style.md).
When refreshing references, use the latest user-provided Stitch Instructions and download the hosted artifacts with `curl -L`.
Do not treat an old chat screenshot, stale local export, or baseline screenshot as the source of truth when it conflicts with the active Stitch source.

When Stitch changes intentionally, update the reference artifacts and screenshot baselines in the same change unit as the implementation.
Do not update baselines only to make a failing visual test pass without confirming the design change.

## Stitch Fidelity Review Agent

Use a Stitch fidelity review agent when approving a new visual baseline or updating an existing one for a Stitch-driven screen.
The agent's role is to compare the Stitch reference and the app-rendered screenshot, then report design-alignment findings for human review.

Use the official project-scoped agent definitions:

- Codex custom agent: `.codex/agents/stitch-fidelity-reviewer.toml`
- Claude project subagent: `.claude/agents/stitch-fidelity-reviewer.md`

The agent should receive:

- The Stitch screenshot for the target screen and viewport when available.
- The app screenshot produced by Playwright for the same route and viewport.
- `DESIGN.md` and any exported Stitch generated code that clarifies the intended design.
- The route, viewport, state, fixture data, and any intentionally accepted differences.

The agent should evaluate perceptual alignment, not exact implementation identity.
It should call out differences in layout hierarchy, spacing, typography, color treatment, component shape, visual effects, responsive behavior, missing elements, overflow, clipping, and text overlap.

The agent should classify findings as:

- Blocking mismatch: the implementation does not preserve the Stitch design intent.
- Review mismatch: the difference may be acceptable but needs a human decision.
- Accepted difference: the difference is explained by product data, platform constraints, or an intentional local adaptation.

The agent does not replace human approval.
A baseline may be created or updated only after the agent findings are reviewed and any accepted differences are recorded in the PR or handoff notes.

## Test Design

Prefer a small number of high-signal visual tests over broad screenshot coverage.
Start with routes that directly implement Stitch screens or shared layout primitives.

Each visual test should:

- Render one stable route or component state.
- Use deterministic data, time, locale-sensitive text, and loading state.
- Set an explicit viewport.
- Wait for fonts, images, animations, and network activity needed for the target state.
- Mask or disable dynamic content that is not part of the design assertion.

For page-level Stitch implementations, cover at least one desktop viewport and one mobile-sized viewport.
Add more viewports only when the design has meaningful breakpoints that are likely to regress.

## Assertions

Use Playwright screenshot assertions for visual baselines.
Keep behavioral assertions minimal and only use them to ensure the target state is ready before taking a screenshot.

Avoid asserting exact CSS property values in visual tests unless the property itself is the contract being protected.
If a behavior can be proven reliably in Vitest without a browser screenshot, keep it in the cheaper test layer.

## Baseline And Diff Policy

Store visual baselines in a stable, reviewable location owned by the UI visual test suite.
Baseline file names should make the route, state, and viewport clear.

Pixel diffs are review signals, not automatic proof of correctness.
When a diff appears, decide whether it is an intended design update, an implementation bug, or rendering noise.

Use a conservative diff threshold that catches meaningful layout, color, typography, and spacing regressions without failing on negligible antialiasing noise.
If a test needs a loose threshold to pass regularly, improve the test setup before accepting the threshold.

## Runtime And CI

Visual regression tests should run against a real browser and a production-like UI build when practical.
They do not need the full backend stack unless the visual state cannot be represented with deterministic fixtures.

Keep visual regression commands separate from `pnpm test` so routine behavior checks remain fast.
Add the visual suite to CI only after baseline storage, browser installation, font availability, artifact upload, and update workflow are stable.

## Review Checks

When reviewing visual regression changes, check that:

- The test protects a design surface that is valuable enough for screenshot maintenance.
- Fixture data is deterministic and does not turn visual tests into business-flow tests.
- Baseline updates are tied to an intentional Stitch or implementation change.
- New or updated Stitch-driven baselines include a Stitch fidelity review agent comparison.
- The tested viewports match the design risk.
- Diffs are inspected visually rather than accepted only because CI passed.
