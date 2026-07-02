---
description: Split changes into atomic commits
---

# cm

Use this skill when the user asks for `cm`, commit management, commit message
drafting, commit splitting, or help preparing commits.

## Core Behavior

- Treat an explicit `cm` request as approval to stage and commit clear,
  commit-ready working tree changes.
- Do not stop only to ask for approval after forming commit messages. Commit the
  accepted atomic candidates immediately and report which commits were created.
- If the current branch is `master` or another configured default branch, create
  and switch to a feature branch before staging and committing.
- Write commit messages in English using Conventional Commits.
- Split changes by atomic commit boundaries, not by file count or diff size.
- Treat commits as squash-oriented explanation units. They should preserve a
  clear review and revert intent, but they do not need to be independently
  runnable when a PR or stacked PR flow records the dependency.
- When more than one reasonable commit boundary exists, choose the boundary that
  is easiest to review and explain, then report the choice. Do not stop only to
  confirm between valid boundaries.
- Include a `Why:` body in every commit message.
- Do not include `What:` or `Tests:` in commit messages.
- Report verification separately in the Claude response or PR description.
- Never revert, overwrite, or discard user changes unless explicitly instructed.

## Bundled Scripts

- Use `scripts/inspect-changes.sh` to collect read-only git facts before split
  decisions when the working tree is non-trivial. Treat its output as a compact
  status and diff summary, not as the final commit boundary.
- Run it as `bash .codex/skills/cm/scripts/inspect-changes.sh`.

## Atomic Commit Definition

An atomic commit is not simply a small commit. It is a commit with one clear
intent that can be understood, reviewed, and reverted as a coherent explanation
unit for PR preparation.

Atomic commits are not required to be the smallest independently runnable state.
When a commit depends on a later commit in the same PR or stacked PR flow, the
dependency is acceptable if it is intentional, visible in `Why:` or the PR body,
and the final PR or stack state is the verification boundary.

Use this checklist as a fast boundary check, not as a reason to stall on a clear
commit:

- **Single intent**: The purpose can be explained in one sentence.
- **Dominant commit type**: The main change naturally fits one type, such as
  `feat`, `fix`, `refactor`, `test`, `docs`, or `chore`. Supporting docs, tests,
  config, or cleanup may stay when they serve the same intent.
- **Reviewable intent**: A reviewer can understand the intent and impact from
  the subject, `Why:`, diff, and any stated PR or stack dependency.
- **Revertable intent**: Reverting this commit removes one coherent change. If
  it is part of a dependent PR or stack, document that dependency instead of
  hiding it.
- **Coherent diff**: All included files contribute to the same problem,
  requirement, or cleanup.
- **Explicit follow-up dependency**: If the commit needs a later commit in the
  same PR or stack to become runnable, the dependency is intentional and visible.
- **Useful test relationship**: Tests stay with the code when they directly
  explain or verify the same intent, but they may live later in the same PR or
  stack when the final state is the verification boundary.

If a candidate is unclear, pick the smallest boundary that preserves the review
and revert intent. If splitting creates a temporary broken intermediate state but
makes the review or stacked PR boundary clearer, allow the split and explain the
dependency in `Why:` or the PR body. If splitting would make the work harder to
understand, keep it together and explain the boundary in `Why:`.

## Split Rules

Keep together:

- Feature code with tests that directly verify it.
- Bug fix code with its regression test.
- Types, config, migrations, or lockfiles required by the same change.
- Small refactors, cleanup, or docs that only exist to make the same change clear
  and reviewable.

Prefer splitting when:

- Changes have different user-visible intents.
- Changes should be reviewed, reverted, or explained separately.
- Dependency, tooling, or test-infrastructure work is useful without the product
  change that happens nearby.
- Documentation or cleanup describes a separate convention or decision rather
  than the same change.

Ask the user before committing only when:

- Part of the diff appears to be unfinished user work.
- The working tree contains unrelated changes that cannot be staged safely from
  the diff.
- Choosing the boundary requires a product, scope, or ownership decision that is
  not inferable from the request and code.
- The next step would discard, overwrite, or otherwise risk user changes.

## Commit Message Rules

Subject format:

```text
<type>: <imperative summary>
```

Examples:

```text
feat: add user registration endpoint
fix: reject duplicate registration emails
test(auth): cover refresh token expiry
```

Rules:

- Start the subject with an imperative verb.
- Do not end the subject with a period.
- Use a scope only when it adds clear value.
- Every commit must include a `Why:` body.
- Do not use `What:`. The subject and diff should show what changed.
- Do not use `Tests:`. Test results belong in the Claude response or PR
  description.

## Why Body Rules

`Why:` records the reasoning that is not obvious from the diff. Even for simple
changes, write at least one sentence explaining why the change is needed.

Include:

- The problem, requirement, or failure case that motivated the change.
- Why this approach was chosen.
- Why simpler alternatives were not used, when relevant.
- Important constraints, tradeoffs, or compatibility concerns.
- The intended boundary of the commit.
- Business, security, or operational context reviewers cannot infer from the
  diff.

Do not include:

- A summary of the diff.
- A file-by-file change list.
- Test execution records.
- A longer restatement of the subject.

Example:

```text
fix: reject duplicate registration emails

Why:
Checking before insertion gives the API a stable validation error instead of
exposing a database constraint failure.
```

## Workflow

1. Inspect the current branch, `git status --short`, and the relevant diffs. Use
   `scripts/inspect-changes.sh` when a structured fact pack would make the
   split faster or less error-prone.
2. If the current branch is `master` or another configured default branch,
   create and switch to a feature branch before staging or committing.
3. Split the working tree changes into the fewest clear commit candidates that
   preserve review and revert intent.
4. Use the atomic checklist as a quick sanity check for those candidates.
5. If the candidates are clear and commit-ready, stage and commit each candidate
   immediately with its Conventional Commit subject and `Why:` body.
6. Ask the user before committing only when the diff appears unfinished, includes
   unrelated user work that cannot be safely separated, or needs a product,
   scope, or ownership decision. Do not ask only because a clear candidate
   depends on a later commit in the same PR or stack.
7. After committing, report which commits were created, including each subject
   and the files included.
8. Report verification separately under `Verification`.
9. If the diff changes while preparing commits, re-check the split before
   committing.