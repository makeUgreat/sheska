---
name: pr
description: Use this project skill for full pull request preparation and creation, including PR unit decisions, commit preparation, branch or stack setup, pushing, opening draft PRs, PR description drafting, squash-merge history writing, and coordinating PR preparation with the cm skill.
metadata:
  short-description: Prepare history-focused pull requests
---

# pr

Use this skill when the user asks for `pr`, `$pr`, pull request preparation,
pull request creation, or PR review readiness.

## Principle

A PR should be reviewable as one coherent decision. When a change has
multiple layers or decisions, default to a **stacked PR set** — built with
GitHub's native stacking (`gh-stack` CLI) — over one large PR, so each layer
stays independently reviewable while the final state is still evaluated
together. This stacking policy is the core of this skill; see "Stacked PRs"
for how to build and open one.

## Core Behavior

- Determine PR type before merge strategy: sub-branch PRs squash into the
  integration branch; integration branch PRs merge `--no-ff` into main.
- Write PR titles and descriptions in English. Default to draft PRs.
- Treat a bare `pr`/`$pr` request, or an explicit request to open or update
  PRs, as approval to run the full flow end to end — commit prep, branch or
  stack setup, push, and opening draft PRs — without a separate confirmation,
  unless a blocker below applies. Don't stop partway (e.g. after drafting a
  title) when a creation path is available.
- Use `cm` first when the working tree has uncommitted changes or the PR
  boundary is unclear.
- If a PR-creation or PR-merge gate is broken by a bug unrelated to the
  work at hand (e.g. a build/harness check fails against `main` itself),
  treat fixing and merging it as higher priority than the original request:
  finish and merge that fix to `main` first, before opening or continuing any
  other PR. Only fall back to stacking other branches on the unmerged fix
  (see Stacked PRs) when the fix itself needs review and can't be fast-tracked
  — merging it first avoids that workaround entirely.
- If the current branch already has an open PR, decide relatedness before
  acting (see PR Unit: Single vs. Stacked): a continuation of that PR's
  intent is an update — push and refresh the body; a separable concern
  becomes a new stacked PR on top of it, not a fold-in.
- When multiple valid PR or stack shapes exist, pick the clearest
  history-meaningful one and report the rationale; don't stop to ask.
- Never fabricate verification — report what ran, what didn't, and why.
- Never revert, overwrite, or discard user changes unless explicitly asked.
- Ask before proceeding only when: the diff looks unfinished, unrelated user
  work can't be safely separated, a product/ownership/reviewer decision isn't
  inferable from the request, or branch/base/remote state is unsafe enough to
  target the wrong history.

Use the GitHub connector to create PRs when available. Use `gh` as a fallback
when connector creation cannot infer the repository or head branch cleanly —
if one path fails on auth or availability, try the other before reporting a
blocker. If push succeeds but PR creation is blocked, report the pushed
branch and GitHub compare URL.

## Branch Structure & Merge Strategy

```
main
 └─ feature/{name}                    (integration branch)
     ├─ feature/{name}/schema
     ├─ feature/{name}/backend
     └─ feature/{name}/ui
```

The diagram shows naming, not git parentage. Independent sub-branches each
branch off the integration branch; sub-branches that depend on each other
(e.g. backend needs schema) should instead chain as a stacked PR set —
`schema` based on the integration branch, `backend` based on `schema`, `ui`
based on `backend` — with the integration branch as the stack's trunk (see
Stacked PRs).

| PR type | Merge | Reason |
|---|---|---|
| Sub-branch → integration branch | `git merge --squash` | Collapse wip commits into one logical unit |
| Default branch → main (no feature) | `git merge --squash` | Standalone change with no integration branch; same treatment as a sub-branch PR |
| Integration branch → main | `git merge --no-ff` | Preserve per-layer history; enable `git bisect` |
| main → integration branch (sync) | `git merge main` | Shared branch; rebase would break in-progress sub-branches |

Rebase is allowed only on private sub-branches — never on integration
branches or main.

If a sub-branch's parent integration branch doesn't exist yet, stop, propose
the inferred name, and wait for user confirmation before creating it. Flag an
integration branch that's gone 2+ weeks without merging to main (conflict risk).

## PR Unit: Single vs. Stacked

A PR is one squash-merge history event — understandable from its title and
body alone. Default to a single PR; use a **stacked PR** when the change has
multiple related-but-separable layers (e.g. schema → backend → ui) that each
deserve independent review, or a single-PR diff would otherwise mix separate
product, rollout, or reviewer decisions.

Keep together: a change and the tests, types, config, or docs needed to
understand and verify it. Split when parts represent different product,
rollout, or reviewer decisions, or when dependency/tooling work stands on its
own. Multiple kinds of change appearing together (docs, runtime, tooling,
tests) is not itself a reason to split — split only when they represent
separate review or rollback decisions.

A stack layer may be temporarily non-runnable on its own if it's still a
clear review unit — name the reason and the completing child PR in its body
rather than forcing independent runnability by merging separable PRs together.

The same test applies when a branch already has an open PR and more work
lands on it: a continuation of that PR's intent stays in it — push and
refresh the body's `Summary`/`Changes`/`Verification`. A separable concern
becomes a new stacked PR on top of it instead of being folded in — see
Stacked PRs for bringing an already-open branch under stack tracking.

## Stacked PRs (gh stack)

Build and open stacked PRs with GitHub's native stacked pull request feature
via the `gh-stack` CLI extension — never by manually setting each PR's base
branch or manually retargeting after a merge. GitHub locks base-branch edits
on any PR that's part of a native stack; `gh pr edit --base` fails or leaves
the PR inconsistent once linked, so restructure only through `gh stack`
commands (`rebase`, `modify`, `sync`), never by hand.

- Prerequisite: `gh extension list`; install with
  `gh extension install github/gh-stack` if missing.
- `<trunk>` follows the branch tier: the integration branch (`feature/{name}`)
  when stacking that feature's sub-branch layers, or `main` when the stack
  has no integration branch (default-branch tier).
- Build while preparing commits: `gh stack init --base <trunk> <branch-1>` on
  the first branch above the trunk, then `gh stack add -m "<msg>" <branch-N>`
  for each additional layer.
- To stack new work on top of a branch that already has an open PR but isn't
  tracked as a stack yet, first bring it under tracking:
  `gh stack init --base <trunk> <existing-branch>`, then `gh stack add` the
  new branch on top.
- This is for genuinely independent branches that only need to share an
  unmerged trunk incidentally (see Core Behavior: prefer merging that trunk
  fix first and avoiding this entirely). It is not the integration-branch
  pattern (see Branch Structure & Merge Strategy) — use an integration
  branch instead when the branches are actual product layers of one feature
  (e.g. schema → backend → ui) that belong together as a reviewable set;
  don't reach for a shared-trunk stack just to keep unrelated work batched.
  When several otherwise-independent branches must all sit on the same
  not-yet-merged trunk (e.g. a repo's PR-creation gate is broken and only an
  unmerged fix branch passes it, and that fix can't be fast-tracked), adopt
  every branch into **one**
  `gh stack init --base <trunk> <branch-1> <branch-2> <branch-3>` call up
  front, in the intended merge order — not one `gh stack init` per branch.
  Separate `init` calls against the same external trunk each create their
  own Stack object on GitHub; reconciling them into one later via
  `gh stack link` is unreliable (observed 422s from GitHub when the trunk
  branch had since been deleted) and can silently corrupt an already-open
  PR's base. Note in each PR's `Stack Context` that the dependency is
  incidental (a build-gate workaround), not a product/review dependency.
- `gh stack submit` pushes and opens the whole stack in one step, as drafts
  by default (add `--open` only if the user asked for ready-for-review).
  Base branches are set automatically — each PR targets the branch below it.
- `gh stack view` (`-s`/`--json`) confirms branch order, PR links, and
  commits before reporting the stack to the user.
- Merge bottom-up with `gh stack merge [<stack-number>|<pr-number>] --squash [-y]`.
  Every tier this project ever stacks (sub-branch → integration branch, or
  default branch → main) merges with squash; the project's only `--no-ff`
  step, integration branch → main, is always a single PR and is never
  stacked. GitHub auto-retargets and rebases the remaining PRs above the
  merged one onto the next base — never do that by hand.
- The instant any stack member merges (via `gh stack merge` or directly on
  GitHub), run `gh stack sync` before any other stack command. Squash merge
  creates a new commit on the target branch, so branches still above the
  merged one carry the pre-merge commit as a stale duplicate until rebased;
  running `link`, `submit`, or a manual base edit before syncing compounds
  into base-branch corruption rather than a clean retarget.
- `gh stack sync [--prune]` resyncs the whole stack after upstream/trunk
  changes.
- All stack branches must live in the same repository (no cross-fork).
- State the merge order in the final user report (bottom to top). GitHub's
  live stack map already shows it, so don't duplicate it as static text in
  every PR body.
- Ask before creating the stack only when the order is a product decision,
  the dependency graph is ambiguous, or branch/remote state is unsafe.

## PR Title & Body

Title = squash-merge commit subject: `<type>: <imperative summary>` (e.g.
`feat: add health check endpoint`). No trailing period; prefer intent over
implementation detail; avoid vague titles like `fix bug`.

Body sections, in order, omitting ones that don't apply:

```markdown
## Summary
- What this PR accomplishes, 1-3 bullets.

## Stack Context
Stacked PRs only: why this is part of a stack and this PR's position (e.g.
`2 of 3: schema -> backend -> ui`). Not the full chain or merge order —
GitHub's stack map already shows that live.

## Why
The durable problem, requirement, decision, or tradeoff this PR exists for.

## Changes
- Meaningful behavior/structure changes, not a file-by-file diff summary.

## Verification
- Exact commands/tests/checks run, including anything skipped and why.

## Merge Strategy
Integration-branch PRs only: `--no-ff`, do not squash, for traceability and
`git bisect`.

## Risk / Notes
- Migrations, compatibility, rollout notes, or `None`.
```

Don't include a commit-by-commit changelog, checklist filler, or claims of
tests that weren't actually run.

## cm Coordination

`cm` prepares commits; `pr` prepares PR-level history. Use `cm` rules to form
atomic commits first, then feed each commit's `Why:` into the PR's `Why`
(don't paste commit messages as a changelog). Move `cm`-reported verification
into the PR's `Verification` section. A PR can bundle several atomic commits
when they form one squash-merge history event.

## Workflow

1. Detect branch tier (sub-branch, integration branch, or default branch) and
   determine PR type and merge strategy first. If the integration branch is
   missing for a sub-branch, stop and confirm the name with the user before
   creating it.
2. Inspect `git status --short`, recent commits, and the diff
   (`scripts/inspect-pr-context.sh` for a structured fact pack). Apply `cm`
   and commit if the working tree has uncommitted changes.
3. Decide single PR vs. stacked PR set using the PR Unit policy above.
4. For a stack, build it with `gh stack init`/`gh stack add` while preparing
   commits, then confirm order with `gh stack view` before opening PRs.
5. Draft the title, body, and (for integration-branch PRs) `Merge Strategy`.
6. Run `pnpm harness:build` from the repository root before pushing. This
   builds the app, compiles migration scripts, builds the Docker image, and
   verifies the image runs. Fix and re-run on failure; do not push or open a
   PR if it fails.
7. Push and open. Single PR: check `gh pr view` first. If one is already
   open and the new work continues its intent, just push (refresh the body
   if it changed); if the new work is a separable concern, stack it on top
   instead (see Stacked PRs) rather than folding it in — use the GitHub
   connector or `gh` for the single-PR push/open path. Stacked set:
   `gh stack submit` creates or updates every PR in the stack in one step
   (drafts by default) — safe to re-run after more commits. Never set stack
   base branches manually.
8. Report verification gaps and the merge order in the final response.
