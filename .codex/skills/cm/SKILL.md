---
name: cm
description: Use this project skill for commit management, commit message drafting, and splitting working tree changes into atomic Conventional Commits before committing.
metadata:
  short-description: Split changes into atomic commits
---

# cm

Use this skill when the user asks for `cm`, commit management, commit message
drafting, commit splitting, or help preparing commits.

## Core Behavior

- Treat an explicit `cm` request as approval to stage and commit clear,
  commit-ready working tree changes.
- Do not stop only to ask for approval after forming commit messages. Commit the
  accepted atomic candidates immediately and report which commits were created.
- Write commit messages in English using Conventional Commits.
- Split changes by atomic commit boundaries, not by file count or diff size.
- Include a `Why:` body in every commit message.
- Do not include `What:` or `Tests:` in commit messages.
- Report verification separately in the Codex response or PR description.
- Never revert, overwrite, or discard user changes unless explicitly instructed.

## Atomic Commit Definition

An atomic commit is not simply a small commit. It is a commit with one clear
intent that can be independently understood, reviewed, and reverted.

Each commit candidate must pass this checklist:

- **Single intent**: The purpose can be explained in one sentence.
- **Single commit type**: The change naturally fits one type, such as `feat`,
  `fix`, `refactor`, `test`, `docs`, or `chore`.
- **Independent review**: A reviewer can understand the intent and impact from
  this commit alone.
- **Independent revert**: Reverting this commit does not remove unrelated
  changes.
- **Coherent diff**: All included files contribute to the same problem,
  requirement, or cleanup.
- **No hidden follow-up dependency**: The commit is not a broken half-step that
  only makes sense with the next commit.
- **Direct test relationship**: Included tests directly verify the feature, fix,
  or refactor in the same commit.

If a candidate fails the checklist, split it further. If splitting would break
the build or make review less clear, keep it together and explain the boundary in
`Why:`.

## Split Rules

Keep together:

- Feature code with tests that directly verify it.
- Bug fix code with its regression test.
- Types, config, migrations, or lockfiles required by the same change.

Split by default:

- Feature work and refactoring.
- Bug fixes and nearby cleanup.
- Test infrastructure changes and feature test additions.
- Documentation improvements and behavior changes.
- Dependency upgrades and features that start using the upgraded dependency.
- Changes that should be independently revertible.

Ask the user before committing when:

- A change naturally spans multiple commit types.
- Revert boundaries and review boundaries conflict.
- Part of the diff appears to be unfinished user work.
- The working tree contains unrelated changes whose commit boundaries are not
  clear from the diff.

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
- Do not use `Tests:`. Test results belong in the Codex response or PR
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

1. Inspect `git status --short` and the relevant diffs.
2. Split the working tree changes into atomic commit candidates.
3. Apply the atomic checklist to each candidate.
4. If the candidates are clear and commit-ready, stage and commit each candidate
   immediately with its Conventional Commit subject and `Why:` body.
5. Ask the user before committing only when the diff appears unfinished, includes
   unrelated user work, or has unclear atomic boundaries.
6. After committing, report which commits were created, including each subject
   and the files included.
7. Report verification separately under `Verification`.
8. If the diff changes while preparing commits, re-check the split before
   committing.
