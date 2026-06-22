---
title: API Test Convention
lang: en
audience: both
applies_to:
  - apps/api
translation: ../ko/test.md
related:
  - ./architecture.md
  - ./index.md
---

# API Test Convention

The API app uses Vitest and separates unit tests from integration tests.
Unit tests are preferred first based on execution speed and verification scope.
Write integration tests when the test must verify multiple real components working together, such as framework configuration, module wiring, Nest application startup, routing, or actual HTTP responses.

## Test Tooling

- `apps/api` tests MUST use Vitest.
- Vitest transforms TypeScript through SWC so NestJS decorator metadata is available in tests.
- Test files SHOULD import `describe`, `it`, `expect`, and lifecycle functions from `vitest`.
- Do not add new Jest tests, Jest config files, `ts-jest`, or `@types/jest`.
- Keep Vitest transform behavior aligned with the API SWC build settings when changing TypeScript target, decorators, or metadata settings.

## Review Heuristics

- Prefer the standard directory for the test type. Unit tests live near the target source file. Integration tests live under the matching architecture path in `apps/api/test/{context}/`.
- Prefer the target name in `describe()`.
- `it()` test case names should be written primarily in Korean so the behavior intent stays easy for the team to review. Keep routes, code identifiers, and technical terms in their original language when that is clearer.
- Each `it()` should call one unit of work and verify one specific behavior result.
- Keep status code, body, and header assertions in the same `it()` when they verify the same execution result.
- Split `it()` blocks when the execution path or expected result differs, such as success, failure, exception, boundary value, authentication/authorization, or validation.
- Verify async behavior clearly with `async/await` or Vitest `resolves`/`rejects` matchers.
- Avoid sharing state between tests. If a shared resource is required, create it in `beforeEach` and clean it up in `afterEach`.
- Tests must produce the same result under the same conditions.

## Unit Tests

- Run unit tests with `pnpm test:unit` from the repository root or `pnpm --filter @sheska/api test:unit`.
- Vitest discovers unit test files with the `.spec.ts` suffix under `apps/api/src`.
- Prefer placing unit tests in a `__tests__` directory inside the target file's directory. Example: `apps/api/src/contexts/posts/domain/__tests__/post-title.spec.ts`
- Target pure services, functions, controllers without HTTP transport, and small units of business logic.
- Unit tests should cover representative edge cases, boundary values, invalid shapes, error paths, immutability, identity/equality behavior, and meaningful default behavior when those cases define the unit's contract. Prefer proving these details at the unit level instead of pushing them into slower integration tests.
- Do not use an HTTP server, actual Nest application startup, or external I/O unless DI configuration itself is the behavior under test.
- Create required dependencies directly or replace them with lightweight mocks/stubs.
- Use a Nest testing module only when DI configuration must be verified.
- A unit of work is the flow from an entry point call to an observable behavior result.
- The behavior result is one of: return value, thrown exception, state change, or dependency call.
- Return values, exceptions, state changes, and dependency calls are different result types, so test them in separate `it()` blocks.

## Shared Contract Tests

- Shared contracts, base classes, kernel helpers, and reusable policies should have especially thorough unit tests for the behavior they own.
- A shared contract test should prove the reusable guarantee once with minimal representative implementations, fixtures, or subclasses.
- Concrete implementations that rely on a shared contract should not repeat inherited or delegated contract tests. They should test only their own validation, configuration, overrides, composition, and domain-specific behavior.
- If a concrete implementation overrides, narrows, or extends shared contract behavior, test both the implementation-specific behavior and compatibility with the shared contract expectation.
- When reviewing coverage, prefer moving duplicated implementation tests up to the shared contract test when the behavior belongs to the shared abstraction.

## Integration Tests

- Run integration tests with `pnpm test:integration` from the repository root or `pnpm --filter @sheska/api test:integration`.
- Vitest discovers integration test files with `.e2e-spec.ts` or `.integration-spec.ts` under `apps/api/test`.
- Prefer splitting integration spec files by context and architecture layer. For example, use `apps/api/test/posts/presentation/posts-http.controller.integration-spec.ts` for an HTTP controller adapter.
- Use integration tests to verify interactions that unit tests cannot cover, such as dependency injection wiring, framework startup, routing, and controller responses.
- If a test uses hard-to-control elements such as an actual network, REST API, system time, file system, or database, separate it as an integration test instead of a unit test.
- Do not use integration tests to repeat every domain or application invariant. Keep detailed domain and application rule coverage in unit tests, and use integration tests for observable boundary behavior such as request and response shape, validation pipe behavior, dependency injection wiring, framework routing, and repository save/find contracts.
- Nest app integration test files should create the app in `beforeEach` and close it in `afterEach` when the app is initialized.
- The outer `describe()` should name the integrated target.
- For route tests, the inner `describe()` should usually be the controller method and route. Example: `describe('GET /')`.

## Commands

```bash
pnpm lint:check         # ESLint checks
pnpm typecheck          # TypeScript type checking
pnpm test:unit          # Unit tests
pnpm test:integration   # Integration and e2e tests
pnpm test               # Unit tests, then integration tests
pnpm test:watch         # Vitest watch mode from the API package
pnpm test:cov           # Unit test coverage from the API package
```

Before opening a PR, run the checks that match the scope of the change.
If only isolated services or functions changed, run `pnpm lint:check`, `pnpm typecheck`, and `pnpm test:unit`.
If routes, module configuration, or application startup flow changed, also run `pnpm test:integration`.
