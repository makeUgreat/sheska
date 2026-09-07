---
title: API Test Convention
lang: en
audience: both
applies_to:
  - apps/api
translation: ../ko/test.md
read_when:
  - Choosing an API test type, location, case structure, double, fixture, or command.
related:
  - ./architecture/source-dependency.md
  - ./persistence/persistence.md
  - ./operability/error.md
---

# API Test Convention

## Scope

- The API app uses Vitest and separates unit tests from integration tests.
- Use the cheapest test layer that can prove the behavior reliably.
  - Use a unit test for behavior owned by one unit with controlled collaborators.
  - Use an integration test for observable behavior that requires an assembled boundary.
- Follow the [source dependency convention](./architecture/source-dependency.md) for test import boundaries.

## Test Tooling

- API tests MUST use Vitest.
- Keep configuration in `apps/api/vitest.config.ts` with named `test.projects`.
- Add a named project when a boundary needs distinct inclusion rules, setup, timeouts, or runtime dependencies.
- Follow the configured filename patterns:
  - Unit tests: `src/**/*.spec.ts`.
  - Integration tests: `test/**/*.integration-spec.ts` or `test/**/*.e2e-spec.ts`.

## Test Case Design

- Name the outer `describe()` after the target under test.
- Write `it()` names primarily in Korean.
  - Keep routes, code identifiers, and technical terms in their original language when clearer.
- Each `it()` SHOULD execute one behavior and verify one result.
  - Keep status, body, and header assertions together when they describe the same response.
  - Split cases when the execution path or expected outcome differs.
- Assert observable results and collaborator interactions, not private helper call order.
- Tests MUST be deterministic and MUST NOT depend on state left by another test.
  - Create and clean up isolated state with the narrowest suitable lifecycle hooks.

## Test Doubles

- Vitest helpers such as `vi.fn()` and `vi.spyOn()` MAY be used to create and inspect test doubles.
- Prefer mocks for configured returns, call verification, or simple error injection.
- Use a hand-written fake or stub when the double needs meaningful state or shared behavior across methods.
- Keep a double in its spec by default.
  - Extract a shared factory only when multiple specs require the same behavior.
- In integration tests, replace only collaborators outside the boundary under test.
  - Keep the adapter, framework wiring, or runtime dependency that the test exists to prove real.

## Fixtures and Helpers

- Keep a fixture or helper in its spec unless reuse or repeated setup justifies extraction.
- Name helpers by side effect:
  - `buildX`: create in-memory values, domain objects, DTOs, rows, or doubles without external I/O.
  - `createX`: persist data, start a runtime resource, or otherwise change external state.
  - `setupX`: assemble a Nest app, testing module, mock group, or boundary runtime.
- Place extracted helpers by ownership:
  - Shared domain fixtures: `test/support/domains/fixtures/`.
  - Boundary fixtures: `test/adapters/{boundary}/{context}/fixtures/`.
  - Boundary setup: `test/adapters/{boundary}/support/`.
  - Helpers shared across integration boundaries: `test/support/`.
- Do not add a test path alias only to shorten imports.

## Unit Tests

### Placement and Scope

- Place unit specs in `__tests__` beside the target source files.
  - Example: `src/contexts/sources/domain/__tests__/source-content.vo.spec.ts`.
- Unit tests MUST NOT start an HTTP server, a real Nest application, or external I/O.
- Construct the target directly and replace its collaborators with lightweight doubles.
- Use a Nest testing module only when DI metadata or module configuration is the behavior under test.

### Domain Tests

- Test behavior and invariants owned by the domain object or service.
- For value objects, prioritize:
  - Construction and normalization.
  - Invariant violations and boundary values.
  - Equality, identity, and explicit immutability guarantees.
- For aggregates and entities, prioritize:
  - Creation and restoration.
  - State transitions and consistency boundaries.
  - Domain events and errors from invalid actions.
- Express cases in domain language rather than DTO, persistence, or API scenarios.

### Use Case Tests

- Make each orchestration branch explicit through inputs and port outcomes.
- Verify application-owned decisions:
  - Command interpretation and branching.
  - Domain result propagation.
  - Required persistence or external-port interactions.
  - Error mapping owned by the use case.
- Do not repeat detailed domain invariants or adapter storage behavior.

### Shared Contract Tests

- Test reusable guarantees of base classes, kernel helpers, and shared policies once at their owner.
- Use minimal representative implementations, fixtures, or subclasses.
- Concrete implementations SHOULD test only their own validation, configuration, composition, and overrides.
  - Retest the shared guarantee when an override narrows or extends it.

## Integration Tests

### Purpose

- Use integration tests for behavior that only an assembled boundary can prove, such as:
  - Framework routing, request parsing, response shaping, and exception filters.
  - Real adapter modules and application-owned port contracts.
  - Database schemas, constraints, ORM queries, transactions, and upserts.
  - Message brokers, external APIs, and other real runtime dependencies.
- Using a controllable clock or in-memory filesystem does not by itself require an integration test.
- Do not repeat every domain or application rule at the integration layer.

### Layout

- Put adapter integration specs under `test/adapters/{boundary}/{context}/`.
  - Boundaries currently include `http`, `local`, `postgres`, `redis`, and `ollama`.
  - Use `platform` as the context for app-wide platform behavior.
  - Identify the target in the filename; do not mirror source-layer directories.
  - Example: `test/adapters/postgres/sources/source.repository.integration-spec.ts`.
- Put tool and static-policy integration specs under `test/static/{tool}/`.
- Keep reusable runtime orchestration under `test/runtime/`.

### Boundary Ownership

- The boundary directory identifies the primary real dependency under test.
- Keep that boundary real and replace unrelated external boundaries with test doubles.
  - HTTP tests verify routing and response behavior with downstream collaborators controlled.
  - Postgres tests verify database wiring and query behavior without requiring a real queue.
- The same entry point MAY appear under multiple boundaries when each test proves a different responsibility.
- Name the test after the boundary-owned behavior, not an incidental result.
- Cross-boundary smoke tests MAY use several real dependencies only to prove production composition.
  - Keep them few, make the broader scope explicit, and prefer happy paths.

### Adapter Coverage

- Unit-test behavior owned by adapter code:
  - Mapping between external or persistence shapes and domain objects.
  - Preservation of domain restoration exceptions.
  - Infrastructure error wrapping and adapter-specific branching.
- Integration-test behavior imposed by the real dependency:
  - Schema and constraint behavior.
  - ORM and protocol compatibility.
  - Transaction, upsert, connection, and real failure behavior.
- When an adapter wraps dependency errors:
  - Unit-test the resulting `InfrastructureException` kind, code, source, and `cause` shape.
  - Add a real failure case only when the dependency's runtime error shape is part of the required contract.
  - Follow the [error policy](./operability/error.md) for exception ownership.
- Limited overlap is acceptable when tests prove different owners of the same observable result.

### Runtime Lifecycle

- Initialize and close every Nest app or application context created by a spec.
- Use `beforeEach` and `afterEach` when each case requires a fresh runtime or isolated mutable state.
- Use `beforeAll` and `afterAll` when the runtime can be shared safely and test data remains isolated.

## Commands

- Static checks:
  - `pnpm --filter @sheska/api lint:check`.
  - `pnpm --filter @sheska/api typecheck`.
- Unit tests:
  - `pnpm --filter @sheska/api test:unit`.
  - `pnpm --filter @sheska/api test:watch`.
  - `pnpm --filter @sheska/api test:cov`.
- Integration projects:
  - `pnpm --filter @sheska/api test:integration:local`.
  - `pnpm --filter @sheska/api test:integration:postgres`.
  - `pnpm --filter @sheska/api test:integration:redis`.
  - `pnpm --filter @sheska/api test:integration:ollama`.
- All integration tests:
  - `pnpm --filter @sheska/api test:integration:all`.
  - `test:integration` is an alias of `test:integration:all`.
- Full API test suite:
  - `pnpm --filter @sheska/api test`.
- Reusable test runtime:
  - `pnpm --filter @sheska/api test:runtime:start`.
  - `pnpm --filter @sheska/api test:runtime:wait`.
  - `pnpm --filter @sheska/api test:runtime:url`.
  - `pnpm --filter @sheska/api test:runtime:stop`.
- Set `SHESKA_TEST_RUNTIME_ID` when running multiple API test runtimes concurrently.
  - Use the same ID for every runtime command in one lifecycle.
- Before a PR, run the checks and test projects affected by the change.

## Review Checks

- Is the behavior tested at the cheapest layer that can prove it?
- Does the test location match the configured Vitest project and real boundary?
- Are doubles limited to collaborators outside the behavior under test?
- Are fixtures and runtime resources isolated and cleaned up?
- Does each case describe one distinct behavior result?
