---
title: UI Test Convention
lang: en
audience: both
applies_to:
  - apps/ui
translation: ../ko/test.md
related:
  - ./index.md
  - ./visual-regression.md
---

# UI Test Convention

The UI app uses Vitest with `jsdom` and separates unit tests from integration tests.
Write tests at the cheapest layer that can prove the behavior reliably.

## Scope

- Use this document when choosing UI test type, test file naming, test setup shape, or UI test commands.
- Browser-rendered visual regression tests are covered by [UI Visual Regression Convention](./visual-regression.md).
- Business-flow browser E2E tests are covered by the `e2e` workspace conventions.

## Test Tooling

- `apps/ui` tests MUST use Vitest for unit and integration tests.
- Keep Vitest configuration centralized in `apps/ui/vite.config.ts` with named `test.projects`.
- Use `jsdom` for both unit and integration tests.
- Use React Testing Library for React rendering and user-observable assertions.

## Test Case Design

- Prefer the target name in `describe()`.
- `it()` test case names should be written primarily in Korean so the behavior intent stays easy for the team to review. Keep routes, code identifiers, and technical terms in their original language when that is clearer.
- Each `it()` should verify one specific observable behavior result.
- Prefer user-observable queries such as text, role, label, and visible state over implementation details.
- Avoid sharing state between tests. Create a new query client, mock client, and rendered tree per test unless a narrower helper already guarantees isolation.
- Tests must produce the same result under the same conditions.

## Test Doubles

- Test code MAY use Vitest helpers such as `vi.fn()`, `vi.spyOn()`, mock return configuration, and mock assertions.
- Prefer mock functions when a collaborator only needs configured return values, call verification, or simple error injection.
- Use a hand-written fake when the test double needs meaningful state or shared behavior across methods.
- Keep test doubles inside the spec file by default. Extract shared factories only when multiple specs need the same setup shape.
- In integration tests, use test doubles only for collaborators outside the UI boundary being verified. The router, React Query, and provider wiring that the integration test exists to prove should remain real.

## Test Layers

### Visual Design Checks

Vitest with `jsdom` is for behavior, accessibility-oriented structure, data states, and routing.
It cannot prove pixel-level or perceptual alignment with Stitch because it does not run a real layout and rendering engine.

When a change claims to implement a Stitch design, keep automated `jsdom` tests focused on observable behavior such as loading, empty, error, navigation, form interaction, and accessible labels.
Verify visual alignment through browser-based review as described in [Design System](./design.md).

Do not add screenshot or pixel-diff assertions to the Vitest `jsdom` suites.
Use the UI visual regression policy when screenshot or pixel-diff coverage is needed.

### Unit Tests

- Unit test files use `*.spec.ts` or `*.spec.tsx`.
- Unit tests target the smallest useful responsibility, such as an API client method, pure helper, hook, mapper, or small component behavior.
- Do not assemble route-level provider trees when the behavior can be proven by calling the unit directly or rendering the component with minimal props.
- Replace network calls, API clients, timers, and other external effects with mocks or stubs.
- Cover representative success, failure, boundary, and error cases when they define the unit's contract.

### Integration Tests

- Integration test files live under `test/` and use `*.integration-spec.ts` or `*.integration-spec.tsx`.
- Place app-level route or composition integration tests under `test/app/`, page-level integration tests under `test/pages/`, and shared test setup or helpers under `test/support/`.
- UI integration tests verify app-level or page-level behavior by assembling the real UI wiring needed for that behavior, such as `MemoryRouter`, `QueryClientProvider`, and `ApiClientProvider`.
- The API boundary should be represented by a mocked `SheskaApiClient` by default.
- Use integration tests for loading, empty, success, error, route parameter, navigation, and user interaction flows that depend on multiple UI collaborators working together.
- Do not use integration tests to repeat every unit-level branch. Keep detailed client, mapper, or component contract coverage in unit tests.

### API Client Integration Tests

- API client integration tests live under `test/api-client/` and use `*.integration-spec.ts`.
- API client integration tests verify the UI-owned `SheskaApiClient` against the real API runtime through HTTP.
- These tests MUST start the API through `@sheska/api` `test:runtime:*` package scripts and MUST NOT import API source files or Nest modules.
- Use `SHESKA_TEST_RUNTIME_ID` to isolate the API runtime used by the UI test process.
- Prepare test data through public HTTP APIs owned by the runtime service. Do not insert seed data directly into another service's database.
- Keep API client integration tests separate from default jsdom UI integration tests because they build and run a Docker-backed API runtime.

## Commands

```bash
pnpm --filter @sheska/ui lint:check         # ESLint checks
pnpm --filter @sheska/ui typecheck          # TypeScript type checking
pnpm --filter @sheska/ui test:unit          # Unit tests
pnpm --filter @sheska/ui test:integration   # Vitest/jsdom UI integration tests
pnpm --filter @sheska/ui test:integration:api-client # API client integration tests against the API test runtime
pnpm --filter @sheska/ui test               # Unit tests, then integration tests
pnpm --filter @sheska/ui test:watch         # Vitest watch mode for unit tests
```

Before opening a PR, run the checks that match the scope of the change.
If UI behavior changed, run `pnpm --filter @sheska/ui test` in addition to static checks.
