---
title: API Idempotent Receiver Policy
lang: en
audience: both
applies_to:
  - apps/api
translation: ../../../ko/operability/fault-tolerance/idempotent-receiver.md
read_when:
  - Deciding whether an operation is naturally idempotent, designing an idempotency key, or implementing server-side deduplication for a mutation that must be safely retryable.
related:
  - ./index.md
  - ./retry.md
---

# API Idempotent Receiver Policy

- An idempotent receiver lets a mutation be retried safely by making repeated delivery of the same logical request produce the same effect as delivering it once.

## Scope

- Use this document when deciding whether an operation is naturally idempotent, how an idempotency key is generated and scoped, how the server deduplicates on it, and what it returns for a duplicate.
- The rule that a mutation is retryable only when idempotent is defined in [API Retry Policy's Mutation Safety Gate](./retry.md#mutation-safety-gate), not by this document. This document defines how that idempotency guarantee itself is provided.
- Retry budget, circuit breaker, and observability compose with this policy but are defined in their own documents; see [API Fault Tolerance Index](./index.md).

## Natural Idempotency

- Some operations are idempotent without any extra mechanism, because repeating them changes nothing beyond the first successful application.
  - Example: a `PUT` that fully replaces a resource with the same representation.
  - Example: a `DELETE` of a resource, when the endpoint treats deleting an already-deleted resource as success rather than an error.
- Prefer natural idempotency over an idempotency key whenever the operation allows it: it requires no additional client or server state.
- An operation is not naturally idempotent when repeating it changes the outcome beyond the first application (for example, "deduct balance," "create order," or a `POST` that appends rather than replaces).

## Idempotent Receiver

- For an operation that is not naturally idempotent, make the server an idempotent receiver: it recognizes a retried request as a duplicate and returns the original result instead of reapplying the effect.
- The caller supplies an idempotency key that identifies one logical operation attempt, distinct from the retry mechanics: a retried call reuses the same key, and a new operation gets a new key.
  - Scope the key to the operation and the caller (for example, per user, per resource) so unrelated callers cannot collide on the same key.
- The server checks the key before applying the effect:
  - If the key is unseen, apply the effect and record the key with its result.
  - If the key was seen and the prior attempt completed, return the recorded result without reapplying the effect.
  - If the key was seen and the prior attempt is still in progress, do not apply the effect concurrently. The exact concurrent behavior (wait for the in-flight attempt, or reject) is an implementation choice, but applying the effect twice is not an acceptable outcome.
- Do not retain a recorded key forever or for a fixed constant duration.
  - Retain it only as long as the retry window that could plausibly reuse it.
  - The retry window depends on the caller's deadline and backoff configuration (see [API Retry Policy](./retry.md) and [API Timeout & Deadline Policy](./timeout-deadline.md)), not one fixed value for every operation.

## Composition With Retry

- [API Retry Policy's Mutation Safety Gate](./retry.md#mutation-safety-gate) is the rule that consumes this document: a mutation is retryable only when it is naturally idempotent or backed by an idempotent receiver as defined here.
- This document does not define retry count, backoff, or which errors are retryable; see [API Retry Policy](./retry.md) for those.
