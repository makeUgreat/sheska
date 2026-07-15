---
title: Monorepo Policy
lang: en
audience: both
applies_to:
  - repository
translation: ../ko/monorepo.md
---

# Monorepo Policy

This repository is a pnpm monorepo.
Repository-level policy decides how workspaces are discovered, how root commands behave, and which checks belong to the monorepo harness.

## Scope

- Use this document when adding, removing, or reorganizing workspaces.
- Use this document when changing root `package.json` scripts.
- Use app-specific convention indexes for rules that only apply inside one app.

## Workspace Ownership

- Each deployable or independently runnable service belongs in its own workspace.
- A workspace owns its package scripts, local static checks, tests, build command, and app-specific dependency rules.
- Shared code should be promoted into a dedicated shared workspace when more than one app needs to import it as production code.
- Apps SHOULD NOT import another app's `src` files directly. Cross-app contracts should move through package dependencies, generated clients, schemas, APIs, or a dedicated shared workspace.

## Cross-Workspace Runtime Test Policy

When one workspace needs another service running for an integration test, the service being started owns the test runtime command.
The consuming workspace should treat that service as a black-box runtime dependency and communicate through the public protocol being tested.

- A workspace MUST NOT import another app's `src` files, framework modules, or test-only internals to compose that app for its own tests.
- A service workspace SHOULD expose package scripts for reusable test runtimes when another workspace needs to test against that service. For example, an API workspace may expose a test runtime command that starts its required database, queue, migrations, environment, application server, readiness check, and shutdown behavior.
- Use `test:runtime:start`, `test:runtime:wait`, `test:runtime:url`, and `test:runtime:stop` for the default reusable service runtime. Add a boundary segment, such as `test:runtime:http:start`, only when one workspace intentionally exposes multiple public runtime boundaries.
- Consuming workspaces SHOULD start another service through `pnpm --filter <workspace> <script>` or through a local harness that delegates to that filtered package script.
- The producing workspace owns runtime details such as compose files, test environment variables, migrations, seeds, ports, readiness checks, and cleanup for its service-specific test runtime.
- The consuming workspace owns only its contract test and the public endpoint configuration it needs, such as a base URL.
- When a runtime uses a dynamic host port to avoid collisions, the producing workspace should expose that endpoint through `test:runtime:url` so consumers do not need to know compose internals.
- Runtime commands that may be used concurrently SHOULD support a caller-provided runtime identifier, such as `SHESKA_TEST_RUNTIME_ID`, and use it to isolate runtime-owned resources like Docker Compose project names.
- Prefer keeping service-specific runtime harnesses in the owning workspace. Promote a shared harness package only after multiple workspaces need the same reusable runtime abstraction.
- Workspaces do not need `test:runtime:*` scripts just because they are apps. Add them only when another workspace needs that app as a runtime dependency.

## Ignore File Policy

The root `.gitignore` owns common generated, dependency, and test-output patterns for all workspaces.
Workspace `.gitignore` files are optional and should contain only workspace-specific generated files that are not covered by the root patterns.

- Put shared patterns such as workspace `node_modules/`, `dist/`, `build/`, `coverage/`, and `.nyc_output/` in the root `.gitignore`.
- Put tool-specific or app-specific outputs, such as Vite timestamp files or a bundled Obsidian `main.js`, in the owning workspace `.gitignore`.
- Do not repeat common root ignore patterns in every workspace `.gitignore`.
- A workspace does not need a `.gitignore` when it has no workspace-specific ignored files.

## Root Command Policy

Root `package.json` scripts represent repository-level workflows.
They MUST NOT be short aliases for one app's command, because those aliases hide ownership and make the command scope ambiguous as the monorepo grows.

- Use `pnpm --filter <workspace> <script>` when intentionally running one workspace command from the repository root.
- Use recursive pnpm commands only for workflows that are meant to apply across workspaces.
- Avoid root `lint` scripts that mutate files across multiple workspaces. Run fix commands in the owning workspace unless a broad formatting change is intentional.

## Static Harness Policy

`harness:static` is the repository-level static verification gate.
The root command SHOULD run repository-owned static checks first, then run workspace-owned static harnesses recursively:

```bash
pnpm deps:check && pnpm -r --if-present harness:static
```

The root `deps:check` command owns repository-level dependency boundary checks.
It should check workspace-to-workspace boundaries, not app-internal layer rules.

Each workspace that participates in static verification owns its own `harness:static` script.
That script should compose the static checks meaningful for that workspace, such as `typecheck`, `lint:check`, and dependency-boundary checks.

Root `typecheck` or `lint:check` scripts are not required when `harness:static` already owns the full static gate.
Add separate root aggregate commands only when they have a clear repository-level use case outside the full harness.

## Review Checks

- A root script name should make its repository-wide scope obvious.
- If a command only targets one app, prefer an explicit `pnpm --filter <workspace> <script>` invocation in docs, hooks, and CI.
- If a dependency rule describes workspace-to-workspace boundaries, add it to the root `deps:check`.
- If a new static check is required for one workspace, add it to that workspace's `harness:static`.
- If a new static check is required for every workspace, define the expectation here and let each workspace compose the local command that satisfies it.
