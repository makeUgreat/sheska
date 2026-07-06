---
description: Prepare history-focused pull requests
---

# pr

Use this skill when the user asks for `pr`, `$pr`, pull request preparation,
pull request creation, PR unit decisions, PR description drafting, PR review
readiness, or squash-merge history cleanup.

## Core Behavior

- Determine the PR type before choosing a merge strategy. Sub-branch PRs
  (`feature/{name}/{layer}` → `feature/{name}`) use squash merge to collapse
  wip commits into one logical unit. Integration branch PRs (`feature/{name}`
  → `main`) use `--no-ff` with commits preserved so the feature history remains
  traceable in main.
- Optimize PR title and body for future readers who need to understand which PR
  introduced a change and why it was made.
- Prefer reviewable, history-meaningful PR units over file-count or commit-count
  boundaries.
- Write PR titles and descriptions in English.
- Use `cm` before PR finalization when the working tree contains uncommitted
  changes or the PR boundary is unclear.
- Treat a bare `pr` or `$pr` request as approval to complete the full PR
  publication flow: inspect the diff, prepare any needed commits, create or
  choose branches, run relevant verification, push the branch or branches, and
  open draft GitHub PRs. Do not interpret `pr` as draft-only, plan-only, or
  body-only work unless the user explicitly says so.
- Treat an explicit `pr` request with uncommitted changes as approval to prepare
  the necessary commits first. Do not stop only to ask whether to commit when the
  diff is a clear, commit-ready PR unit.
- Treat an explicit request to prepare, open, or update PRs as approval to create
  a clear single PR or stacked PR set, including the necessary commit, branch,
  base-branch, push, and PR tool steps, without asking for another confirmation.
- Treat an explicit request to open or update a PR as approval to use the
  prepared title and body and run the PR tool without a separate confirmation
  step.
- When more than one reasonable PR or stack shape exists, choose the clearest
  history-meaningful option and report the rationale. Do not stop only to ask the
  user to choose between valid review shapes.
- Never fabricate verification. Clearly report tests that were run, skipped, or
  could not be run.
- Never revert, overwrite, or discard user changes unless explicitly instructed.

## PR Creation Default

Default to creating draft PRs after preparing the history. A `pr` request is
not complete until each clear PR unit has a corresponding local commit, pushed
branch, and draft PR URL, unless a blocker requires user input.

Use the GitHub CLI (`gh`) to create PRs. If pushing succeeds but PR creation
is blocked, report the pushed branch and GitHub compare URL.

Ask before PR creation only when the existing split-rule blockers apply: the
diff appears unfinished, unrelated user work cannot be separated safely, product
or ownership decisions are not inferable, or branch/base/remote state could
target the wrong history.

## Branch Structure

This project uses a tiered branch structure. Identify the branch tier before
deciding the PR type, merge strategy, and base branch.

```
main
 └─ feature/{name}                    (integration branch)
     ├─ feature/{name}/schema
     ├─ feature/{name}/backend
     └─ feature/{name}/ui
```

**Missing integration branch**: If the current branch matches a sub-branch
pattern (`feature/{name}/{layer}`) but the parent integration branch
(`feature/{name}`) does not exist locally or remotely:
1. Stop and do not open any PR.
2. Infer the integration branch name from the current branch name.
3. Propose the inferred name as a suggestion and ask the user to confirm,
   provide a different name, or cancel.
4. Create the integration branch from the default branch only after the user
   confirms the name.

**Integration branch expiry**: Note when an integration branch has existed for
more than two weeks without merging to main, as diff accumulation increases
conflict risk.

## Merge Strategy by PR Type

| PR type | Merge command | Reason |
|---|---|---|
| Sub-branch → integration branch | `git merge --squash` | Collapse wip commits; produce one logical-unit commit |
| Integration branch → main | `git merge --no-ff` | Preserve per-layer commits; keep feature boundary visible in main history; enable `git bisect` |
| main → integration branch (sync) | `git merge main` | Integration branch is shared; rebase rewrites hashes and breaks sub-branches in progress |

**Rebase rule**: Rebase is allowed on private sub-branches. Rebase is
prohibited on shared branches (integration branches and main).

## Bundled Scripts

- Use `scripts/inspect-pr-context.sh` to collect read-only branch comparison
  facts before deciding the PR unit.
- Use `scripts/render-stack-order.sh` for stacked PRs to generate the branch
  chain, parent/child positions, merge order, retarget/rebase note, and final
  verification target.
- These scripts provide deterministic evidence and stack notes. They do not
  decide the PR unit, write the durable `Why`, or replace user-facing judgment.
- Run them with `bash .codex/skills/pr/scripts/<script>.sh --help` for exact
  options.

## PR Unit Definition

A PR is one squash-merge history event. It should remain understandable when the
branch history contains only the squash commit title and the PR body.

A stacked PR may be temporarily non-runnable on its own when it is still a clear
review and history unit. Do not collapse logically separate PRs only to keep each
intermediate PR independently runnable. The final stack state must be runnable
or the remaining verification gap must be explicit.

Use this checklist as a fast PR-unit check, not as a reason to stall on a clear
boundary:

- **Single history event**: The change can be explained as one problem,
  requirement, decision, or cleanup.
- **Clear reason**: A future reader can understand why the change happened
  without reconstructing the entire diff.
- **Reviewable boundary**: A reviewer can approve or reject the PR as one
  coherent decision.
- **Revertable intent**: Reverting the squash commit would remove one coherent
  change, not unrelated work.
- **Coherent verification**: The test or inspection evidence maps to the PR's
  stated intent, or the PR clearly states that final-stack verification is the
  relevant boundary.
- **Visible stack dependency**: If the PR depends on another PR or temporarily
  breaks before a child PR lands, the parent, child, and runnable final state are
  visible in the PR body.
- **No hidden bundle**: The PR does not hide unrelated refactors, dependency
  upgrades, documentation changes, or cleanup under a feature or fix.

If a candidate is unclear, pick the smallest history-meaningful boundary that a
reviewer can approve as one decision. If a candidate is a coherent history event
but creates a temporary broken intermediate state, prefer a stacked PR with
explicit dependency and merge-order notes over a larger mixed PR. Keep a larger
PR when splitting would make the history less understandable.

## Split Rules

Keep together:

- A feature, fix, or refactor with tests that directly verify it.
- Types, configuration, migrations, lockfiles, or documentation required to make
  the same change understandable and working.
- Small supporting cleanup when it only exists to make the main change possible
  and would be misleading as a separate PR.

Prefer splitting when:

- Changes represent different product, operational, or convention decisions.
- Changes need different reviewers or different rollback decisions.
- Dependency, tooling, or test-infrastructure work is useful without the product
  change that happens nearby.
- Documentation or cleanup describes a separate durable decision rather than the
  same change.

Ask the user before finalizing the PR plan only when:

- Part of the diff appears to be unfinished user work.
- The diff includes unrelated user work that cannot be separated safely.
- The PR or stack boundary requires a product, rollout, ownership, or reviewer
  decision that is not inferable from the request and code.
- Branch, remote, or base-branch state is unsafe or ambiguous enough that opening
  the PR could target the wrong history.

## Split Decision Before Opening PRs

Before opening or updating a PR, always decide the PR unit and include that
decision in the PR preparation output or final user report. Do not pause only to
ask the user to approve the split decision when the boundary is clear.

Use `scripts/inspect-pr-context.sh`, `git diff --name-status`, or the branch
comparison to scan the diff before deciding the PR unit. Treat change kinds as
evidence, not as automatic split rules:

- Documentation-only convention changes.
- Runtime or API behavior changes.
- Lint, build, test tooling, or harness changes.
- Shared refactors or cross-layer contracts.
- Dependency or lockfile changes.
- Tests.

Do not split mechanically only because multiple change kinds appear. Split when
the mixed kinds represent separate history, review, or rollback decisions. Keep
them together when they are required to explain, verify, or land one coherent
requirement.

If the final plan keeps multiple change kinds in one PR, state the reason in
the PR body or final report. Acceptable reasons include one coherent requirement,
avoiding a broken intermediate state that would not be clearer as an explicit
stack, keeping required tests with the behavior they verify, or keeping a small
shared contract change that is necessary for the same boundary.
Do not open a large mixed PR without documenting why it is one PR instead of
multiple PRs.

## Stacked PRs

Use stacked PRs when multiple reviewable history events are related and the final
state should be evaluated together.

- A clear `pr`, `open PR`, or equivalent request is approval to create the full
  stacked PR set when the stack boundary is clear.
- Build the stack from the base branch outward: `main <- pr-1 <- pr-2 <- pr-3`.
- Set each child PR's base branch to its parent PR branch.
- State the merge order explicitly in every stacked PR and in the final user
  report. The merge order is parent to child; for `main <- pr-1 <- pr-2 <-
  pr-3`, merge `pr-1`, then `pr-2`, then `pr-3`.
- After a parent PR merges, note that child PRs must be retargeted or rebased
  onto the next parent or the base branch before merging.
- If an intermediate PR is not independently runnable, include the reason, the
  child PR that completes the runnable state, and the final verification target.
- Ask before creating the stack only when the order is a product decision, the
  dependency graph is ambiguous, branch or remote state is unsafe, or the diff
  includes unfinished or unrelated user work.

## cm Skill Coordination

Use `cm` as the commit-level preparation step and `pr` as the PR-level history
step.

- If there are uncommitted changes, inspect the diff and use `cm` rules to form
  atomic commit candidates before drafting the PR.
- When those candidates are clear and belong to the requested PR, create the
  commits before drafting the PR without asking for another approval. The `pr`
  request is the approval to perform this commit-preparation step.
- The PR unit is not automatically the same as one commit. A PR can contain
  multiple atomic commits when they form one squash-merge history event.
- Use each commit's `Why:` body as input for the PR-level `Why`, but do not
  paste commit messages as a changelog.
- Move verification reported during `cm` work into the PR `Verification`
  section.
- If `cm` suggests multiple unrelated commit groups, create the clear multiple
  PRs or stacked PR set when the boundary is inferable. Ask only when combining
  or splitting would change product scope, ownership, or rollout intent.

## PR Title Rules

The title is the default squash-merge commit subject, so make it useful in
`git log`.

Subject format:

```text
<type>: <imperative summary>
```

Examples:

```text
feat: add health check endpoint
fix: reject invalid registration payloads
docs: document PR history rules
```

Rules:

- Follow Conventional Commit style when it fits the change.
- Start the summary with an imperative verb.
- Prefer intent over implementation detail.
- Use a scope only when it adds clear value.
- Do not end the title with a period.
- Avoid vague titles such as `fix bug`, `update code`, or `refactor stuff`.

## PR Body Rules

Use this structure by default. Omit `Stack / Merge Order` for non-stacked PRs.
For integration branch PRs (`feature/{name}` → `main`), include `Merge
Strategy` to make the `--no-ff` requirement explicit to the reviewer:

```markdown
## Summary

- ...

## Stack / Merge Order

- ...

## Why

...

## Changes

- ...

## Verification

- ...

## Merge Strategy

Merge with `--no-ff`. Do not squash. Preserves per-layer commit history for
traceability and `git bisect`.

## Risk / Notes

- ...
```

Omit `Merge Strategy` for sub-branch PRs (squash is the default expectation).

Section rules:

- `Summary`: State what the PR accomplishes in one to three bullets.
- `Stack / Merge Order`: Include this section only for stacked PRs. State the
  branch chain, this PR's position, parent and child PRs, merge order, any
  retarget/rebase requirement after parent merges, and whether this PR is
  independently runnable.
- `Why`: Preserve the durable context: the problem, requirement, decision,
  tradeoff, constraint, or alternative that explains why this PR exists.
- `Changes`: List the meaningful behavior or structure changes. Do not produce a
  file-by-file diff summary unless the file boundary is the point.
- `Verification`: List exact commands, tests, manual checks, or inspections that
  were performed. Include skipped or unavailable verification when relevant.
- `Risk / Notes`: Call out migrations, compatibility concerns, rollout notes,
  follow-up work, reviewer focus areas, or state `None` when there is nothing
  notable.

Do not include:

- A long commit-by-commit changelog.
- Generic checklist filler.
- Claims that tests passed unless they were actually run.
- Review instructions that belong in the user response rather than the PR body.

## Workflow

1. Detect the branch tier (sub-branch, integration branch, or default branch)
   and determine the PR type and merge strategy before any other step. If the
   current branch matches a sub-branch pattern but the integration branch does
   not exist, stop, propose the inferred integration branch name, and wait for
   user confirmation before creating it.
2. Inspect `git status --short`, recent commits, and the relevant diff or branch
   comparison. Use `scripts/inspect-pr-context.sh` when a structured fact pack
   would make the PR unit decision faster or less error-prone.
3. If the working tree has uncommitted changes, apply `cm` rules first to
   identify atomic commit candidates.
4. If the commit candidates are clear, commit-ready, and belong to the requested
   PR, stage and commit them before drafting the PR.
5. Ask the user before committing only when the diff appears unfinished, includes
   unrelated user work that cannot be safely separated, or requires a product,
   scope, ownership, reviewer, or base-branch decision. Do not ask only because
   the clear boundary is multiple PRs.
6. Decide whether the change belongs in one PR or a stacked PR set using the PR
   unit checklist and the split gate.
7. For stacked PRs, define the branch chain, parent/child PRs, merge order, and
   final runnable verification target before opening or updating PRs. Use
   `scripts/render-stack-order.sh` to avoid merge-order mistakes.
8. Record the PR unit decision and merge strategy before opening or updating any PR.
9. Draft the PR title as the squash-merge commit subject (sub-branch PRs) or
   the feature-boundary label (integration branch PRs).
10. Draft the PR body using the default sections, emphasizing durable `Why`
    context. Include `Merge Strategy` for integration branch PRs.
11. Report verification gaps in the PR body or final response. Do not block PR
    opening for a verification gap unless the user requested that gate or the gap
    makes the PR misleading.
12. Push each prepared branch to the remote and open draft PRs for the clear
    single PR or stacked PR set with the drafted titles, bodies, base branches,
    and merge-order notes without asking for another approval, unless a blocker
    requires user input.