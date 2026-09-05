---
title: ADR Writing Guide
lang: en
audience: both
applies_to:
  - repository
  - apps/*
translation: ../ko/adr.md
related:
  - ./documentation-guidelines.md
---

# ADR Writing Guide

Architecture Decision Records (ADRs) record durable design decisions for the repository or for a specific app.

## When To Write One

- This guide specializes [Documentation Guidelines](./documentation-guidelines.md) for the ADR document type.
  - General document policy — language pairs, metadata — still applies to ADRs.
- Use an ADR to record a durable design decision with real tradeoffs worth explaining to a future reader.
- Do not write an ADR for a routine implementation choice that tests already pin down.

## Location And Numbering

- Number ADRs in the order they are accepted, starting at `0001`.
- A repository-wide decision goes under `docs/en/adr/`, paired with `docs/ko/adr/`.
- An app-scoped decision goes under `apps/*/docs/en/adr/`, paired with `apps/*/docs/ko/adr/`.
- Follow [Language Pairs](./documentation-guidelines.md#language-pairs) for the pairing rule itself.

## Structure

- One ADR = one decision.
  - Split unrelated decisions into separate ADRs.
- Title format: `NNNN: <short decision phrase>`.
  - Name the decision, not the problem.
- Required sections, in order: `Status`, `Context`, `Decision`, `Consequences`.
  - `Status` is one value: `Proposed`, `Accepted`, `Superseded by ADR-NNNN`, or `Deprecated`.

## Writing Style

- Write every section as nested `-` bullets, not prose paragraphs.
  - An ADR's job is to make the reason for a decision easy to find, not to read smoothly end to end.
  - One idea per bullet. If a bullet joins two claims with "and", split it.
  - Put the fact or decision on the top-level bullet. Put its reason, trade-off, or example on a bullet nested under it.

## Section Content

- `Context`: only the facts that make the decision necessary, and the alternatives that were rejected, with why.
  - Link to a policy doc instead of restating its background.
- `Decision`: what was decided, as bullets a reader could act on.
  - Illustrative code documents intent; it is not the implementation.
- `Consequences`: what becomes true after the decision, gains and accepted costs listed separately.
  - An accepted-cost bullet MUST say why the cost is acceptable, not just name it.

## Example

Before (prose, reason is buried):

> A server-side batch diff endpoint was considered as an alternative. It was set aside for the same reason the sync policy already rules out new server batch endpoints for v1: this is a single trusted client in a personal, single-user deployment, and the added server surface is not justified yet.

After (bullet, reason is the first thing you see):

- Considered a server-side batch diff endpoint as an alternative.
  - Rejected: same reasoning as the policy's existing "no new server batch endpoint" decision — single trusted client, personal deployment, no case yet for more server surface.