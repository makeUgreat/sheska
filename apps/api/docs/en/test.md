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
Write integration tests when the test must verify observable behavior across real boundaries, such as framework routing, actual HTTP responses, real adapter modules, or external dependencies.

## Test Tooling

- `apps/api` tests MUST use Vitest.

## Review Heuristics

- Prefer the target name in `describe()`.
- `it()` test case names should be written primarily in Korean so the behavior intent stays easy for the team to review. Keep routes, code identifiers, and technical terms in their original language when that is clearer.
- Each `it()` should call one unit of work and verify one specific behavior result.
- Keep status code, body, and header assertions in the same `it()` when they verify the same execution result.
- Split `it()` blocks when the execution path or expected result differs, such as success, failure, exception, boundary value, authentication/authorization, or validation.
- Avoid sharing state between tests. If a shared resource is required, create it in `beforeEach` and clean it up in `afterEach`.
- Tests must produce the same result under the same conditions.

## Unit Tests

- Prefer placing unit tests in a `__tests__` directory inside the target file's directory. Example: `apps/api/src/contexts/posts/domain/__tests__/post-title.spec.ts`
- Target pure services, functions, controllers without HTTP transport, and small units of business logic.
- Unit tests should cover representative edge cases, boundary values, invalid shapes, error paths, immutability, identity/equality behavior, and meaningful default behavior when those cases define the unit's contract. Prefer proving these details at the unit level instead of pushing them into slower integration tests.
- Do not use an HTTP server, actual Nest application startup, or external I/O.
- Create required dependencies directly or replace them with lightweight mocks/stubs.
- Use a Nest testing module only when DI configuration must be verified.

## Shared Contract Tests

- Shared contracts, base classes, kernel helpers, and reusable policies should have especially thorough unit tests for the behavior they own.
- A shared contract test should prove the reusable guarantee once with minimal representative implementations, fixtures, or subclasses.
- Concrete implementations that rely on a shared contract should not repeat inherited or delegated contract tests. They should test only their own validation, configuration, overrides, composition, and domain-specific behavior.
- If a concrete implementation overrides, narrows, or extends shared contract behavior, test both the implementation-specific behavior and compatibility with the shared contract expectation.
- When reviewing coverage, prefer moving duplicated implementation tests up to the shared contract test when the behavior belongs to the shared abstraction.

## Integration Tests

- Prefer splitting integration spec files by context and architecture layer. For example, use `apps/api/test/contexts/posts/presentation/posts-http.controller.integration-spec.ts` for an HTTP controller adapter and `apps/api/test/contexts/sources/infrastructure/persistence/source.postgres-drizzle.repository.integration-spec.ts` for a Postgres repository adapter.
- Use integration tests to verify interactions that unit tests cannot cover, such as routing, request and response handling, real adapter contract behavior, and real external dependency behavior.
- If a test uses hard-to-control elements such as an actual network, REST API, system time, file system, or database, separate it as an integration test instead of a unit test.
- Do not use integration tests to repeat every domain or application invariant. Keep detailed domain and application rule coverage in unit tests, and use integration tests for observable boundary behavior such as request and response shape, validation pipe behavior, framework routing, adapter wiring observed through a route or port contract, and repository save/find contracts.
- Nest app integration test files should create the app in `beforeEach` and close it in `afterEach` when the app is initialized.
- The outer `describe()` should name the integrated target.
- For route tests, the inner `describe()` should usually be the controller method and route. Example: `describe('GET /')`.

### Adapter Boundary Scope

Adapter integration tests should target the application-owned port or protocol contract through the real adapter implementation and any required external dependency.

Split adapter test coverage by ownership of the behavior under test.
Unit tests should cover behavior owned by the adapter code itself, such as mapping between external or persistence shapes and domain objects, preserving domain restoration errors, converting adapter or infrastructure failures into the application-owned error contract, and adapter-specific branching that can be proven without real external I/O.
Integration tests should cover behavior that only becomes meaningful when the selected boundary is assembled, such as real database schema and constraint behavior, ORM query compatibility, transaction or upsert behavior, and repository save/find contracts observed through the real adapter module.

Prefer proving each behavior at the cheapest test layer that can prove it reliably.
Do not repeat detailed domain, application, or mapper invariant cases in integration tests only because the adapter participates in the flow.
Integration tests may overlap with unit tests only when the same observable result proves a different responsibility, such as verifying that a real database constraint produces the repository error contract already covered with a fake database in unit tests.

## Commands

```bash
pnpm lint:check         # ESLint checks
pnpm typecheck          # TypeScript type checking
pnpm test:unit          # Unit tests
pnpm test:integration   # Integration and e2e tests that do not require Postgres
pnpm test:integration:postgres # Postgres-backed integration tests
pnpm test:integration:all # All integration tests
pnpm test               # Unit tests, then all integration tests
pnpm test:watch         # Vitest watch mode from the API package
pnpm test:cov           # Unit test coverage from the API package
```

Before opening a PR, run the checks that match the scope of the change.
If only isolated services or functions changed, run `pnpm lint:check`, `pnpm typecheck`, and `pnpm test:unit`.
