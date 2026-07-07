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

## Scope

- Use this document when choosing test type, test file placement, test case shape, or API test commands.

## Test Tooling

- `apps/api` tests MUST use Vitest.
- Keep Vitest configuration centralized in `apps/api/vitest.config.ts` with named `test.projects`.
  Add a new test boundary as a named project unless Vitest or another tool requires a separate config file.

## Test Case Design

- Prefer the target name in `describe()`.
- `it()` test case names should be written primarily in Korean so the behavior intent stays easy for the team to review. Keep routes, code identifiers, and technical terms in their original language when that is clearer.
- Each `it()` should call one unit of work and verify one specific behavior result.
- Keep status code, body, and header assertions in the same `it()` when they verify the same execution result.
- Split `it()` blocks when the execution path or expected result differs, such as success, failure, exception, boundary value, authentication/authorization, or validation.
- Avoid sharing state between tests. If a shared resource is required, create it in `beforeEach` and clean it up in `afterEach`.
- Tests must produce the same result under the same conditions.

## Test Doubles

- Test code MAY depend on Vitest helpers such as `vi.fn()`, `vi.spyOn()`, mock return configuration, and mock assertions to build and inspect test doubles.
- Prefer test-library mocks over bespoke stub classes when a dependency only needs configured return values, call verification, or simple error injection.
- Use a hand-written fake or stub class when the test double needs meaningful state, shared behavior across methods, or a domain-specific in-memory implementation that would be harder to read as a group of mock functions.
- Keep test doubles at the cheapest useful scope. Define them inside the spec file by default, and extract shared factories only when multiple tests need the same behavior.
- In integration tests, use test doubles only for collaborators outside the boundary being verified. Do not mock the adapter, runtime dependency, or framework wiring that the integration test exists to prove.
- For boundary-specific integration tests under `test/{boundary}/`, the boundary directory identifies the real dependency under verification. Replace unrelated boundary adapters with test doubles unless the test is explicitly about their boundary.

## Test Fixtures and Factories

- Keep a fixture or helper inside the spec file by default. Extract it only when multiple specs need the same setup shape or when repeated setup hides the behavior under test.
- Use `buildX` for pure fixture factories that only create in-memory values, domain objects, DTOs, rows, or test doubles without external I/O or persistence side effects.
- Use `createX` only when the helper persists data, starts runtime resources, or otherwise changes external state.
- Use `setupX` for helpers that assemble a test environment, such as a Nest application, testing module, mock group, or boundary runtime.
- Context-wide fixtures shared by unit and integration tests SHOULD live under `test/contexts/{context}/fixtures/`.
- Boundary-specific fixtures SHOULD live under the matching boundary directory, such as `test/postgres/contexts/{context}/fixtures/`.
- Keep helpers shared by multiple integration boundaries under `test/support/`.
- Do not add a test path alias only to shorten imports. Use relative imports unless the source dependency convention intentionally introduces a test-specific alias.

## Test Layers

### Unit Tests

- Prefer placing unit tests in a `__tests__` directory inside the target file's directory. Example: `apps/api/src/contexts/sources/domain/__tests__/source-fingerprint.vo.spec.ts`
- Target pure services, functions, controllers without HTTP transport, and small units of business logic.
- Unit tests should cover representative edge cases, boundary values, invalid shapes, error paths, immutability, identity/equality behavior, and meaningful default behavior when those cases define the unit's contract. Prefer proving these details at the unit level instead of pushing them into slower integration tests.
- Do not use an HTTP server, actual Nest application startup, or external I/O.
- Create required dependencies directly or replace them with lightweight mocks/stubs.
- Use a Nest testing module only when DI configuration must be verified.

#### Domain Unit Tests

- Domain unit tests should focus on behavior and invariants owned by the domain object or domain service.
- For value objects and domain values, prioritize valid construction, normalization, invariant violations, boundary values, equality or identity behavior, and immutability only when it is an explicit contract.
- For aggregates and entities, prioritize lifecycle creation and restoration, state transitions, consistency boundary protection, domain event emission, and thrown domain errors for invalid domain actions.
- Express cases in domain language. Do not shape domain tests around DTO, persistence, or API scenarios unless that shape is itself a domain concept.

#### Use Case Unit Tests

- Use case unit tests should be written as cases that reveal the application flow the use case coordinates. Split cases by business situation, make each orchestration branch explicit through inputs and collaborator outcomes, and assert the resulting decision or side effect instead of private helper call order.
- Prioritize application-level decisions, such as command interpretation, branching by repository or port results, domain result propagation, required persistence or external port calls, and error mapping owned by the use case.
- Replace collaborators with mocks or stubs at the port boundary. Configure collaborator outcomes to make each orchestration branch explicit, then assert the final result and observable port interactions.
- Do not repeat detailed domain invariants or adapter storage behavior in use case unit tests. Keep those in domain unit tests or boundary integration tests.

### Shared Contract Tests

- Shared contracts, base classes, kernel helpers, and reusable policies should have especially thorough unit tests for the behavior they own.
- A shared contract test should prove the reusable guarantee once with minimal representative implementations, fixtures, or subclasses.
- Concrete implementations that rely on a shared contract should not repeat inherited or delegated contract tests. They should test only their own validation, configuration, overrides, composition, and domain-specific behavior.
- If a concrete implementation overrides, narrows, or extends shared contract behavior, test both the implementation-specific behavior and compatibility with the shared contract expectation.
- When reviewing coverage, prefer moving duplicated implementation tests up to the shared contract test when the behavior belongs to the shared abstraction.

### Integration Tests

- Prefer splitting integration spec files by boundary, context, and architecture layer. For example, use `apps/api/test/http/contexts/sources/presentation/sources-http.controller.integration-spec.ts` for an HTTP controller adapter, and `apps/api/test/postgres/contexts/sources/infrastructure/persistence/source.repository.integration-spec.ts` for a Postgres-backed repository adapter.
- Use integration tests to verify interactions that unit tests cannot cover, such as routing, request and response handling, real adapter contract behavior, and real external dependency behavior.
- If a test uses hard-to-control elements such as an actual network, REST API, system time, file system, or database, separate it as an integration test instead of a unit test.
- Do not use integration tests to repeat every domain or application invariant. Keep detailed domain and application rule coverage in unit tests, and use integration tests for observable boundary behavior such as request and response shape, validation pipe behavior, framework routing, adapter wiring observed through a route or port contract, and repository save/find contracts.
- Nest app integration test files should create the app in `beforeEach` and close it in `afterEach` when the app is initialized.
- The outer `describe()` should name the integrated target.
- For route tests, the inner `describe()` should usually be the controller method and route. Example: `describe('GET /')`.

#### Integration Boundary Layout

Group integration specs under `test/{boundary}/`.
The boundary directory names the protocol or runtime dependency under verification, such as HTTP, Postgres, Redis, object storage, a message broker, or a real external API.
Nest one level deeper to name the bounded context: `test/{boundary}/{context}/`.
Use the filename to identify the target; do not mirror the source architecture layer in the path.
For example, prefer `test/postgres/sources/upload-source.use-case.integration-spec.ts` over encoding the layer path in the directory.

Use `test/domains/fixtures/` for shared domain fixtures and helpers that are not owned by one integration boundary.
Use `test/{boundary}/{context}/fixtures/` for boundary-specific fixtures.
Place boundary-specific setup and support files under `test/{boundary}/support/`.
Keep helpers shared by multiple integration boundaries under `test/support/`.

#### Adapter Boundary Scope

Adapter integration tests should target the application-owned port or protocol contract through the real adapter implementation and any required external dependency.

Split adapter test coverage by ownership of the behavior under test.
Unit tests should cover behavior owned by the adapter code itself, such as mapping between external or persistence shapes and domain objects, preserving domain restoration exceptions, wrapping adapter or infrastructure exceptions with useful context, and adapter-specific branching that can be proven without real external I/O.
Integration tests should cover behavior that only becomes meaningful when the selected boundary is assembled, such as real database schema and constraint behavior, ORM query compatibility, transaction or upsert behavior, and repository save/find contracts observed through the real adapter module.

Prefer proving each behavior at the cheapest test layer that can prove it reliably.
Do not repeat detailed domain, application, or mapper invariant cases in integration tests only because the adapter participates in the flow.
Integration tests may overlap with unit tests only when the same observable result proves a different responsibility, such as verifying that a real database constraint produces the repository exception behavior already covered with a fake database in unit tests.

#### Boundary Ownership and Overlap

The integration test boundary directory defines the primary real boundary under verification.
Do not decide the test scope only from the entry point being called.
The same route, controller, use case, or port may appear in more than one integration boundary when each test proves a different responsibility.

Within a boundary-specific integration test, keep the primary boundary real and replace unrelated external boundaries with test doubles.
For example, an HTTP health test under `test/http/` should verify route matching, status codes, response body shape, and exception-filter mapping with database and queue collaborators mocked.
A Postgres health test under `test/postgres/` should verify the real database module, provider wiring, and query compatibility, while mocking queue collaborators unless the test is explicitly about the queue boundary.

Test names in boundary-specific integration tests should describe the responsibility owned by that boundary, not just the shared entry point or an incidental observable result.
For example, a Postgres health test may call `GET /health`, but its `describe()` and `it()` names should emphasize real Postgres wiring or query compatibility rather than HTTP status codes or response body shape.

Failure cases belong at the cheapest layer that owns the behavior.
Protocol error mapping and response shape failures usually belong in the protocol boundary test with controlled test doubles.
Real dependency failure cases belong in that dependency boundary only when the behavior cannot be proven reliably without the real dependency, such as real database constraint behavior, transaction behavior, connection setup, or ORM query compatibility.

Cross-boundary smoke tests that use several real external dependencies are allowed only when they prove production composition rather than a single adapter contract.
Keep them few, prefer happy-path coverage, and place or name them so the broader scope is explicit.

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
