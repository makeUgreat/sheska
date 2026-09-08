---
title: API Fault Tolerance Index
lang: en
audience: both
applies_to:
  - apps/api
translation: ../../../ko/operability/fault-tolerance/index.md
related:
  - ./retry.md
  - ./timeout-deadline.md
  - ./async-workflow-retry.md
  - ./circuit-breaker.md
  - ./idempotent-receiver.md
  - ./retry-budget.md
  - ./transaction-retry.md
---

# API Fault Tolerance Index

## Purpose

- This index groups `apps/api` conventions for handling failures when calling external dependencies.
  - External dependencies include external APIs, LLMs, network calls, and queues.
  - Covered convention topics include retry, timeout/deadline, async/workflow/saga retry, circuit breaker, idempotent receiver, retry budget, database transaction retry, and related mechanisms.
  - Related mechanisms include bulkhead, fallback, graceful degradation, and health-check-based failover as they are formalized into convention documents.

## Synchronization Policy

- English and Korean `apps/api` fault-tolerance documents are paired documents that should describe the same policy.
  - When the paired documents conflict, choose the intended policy from either language and update both documents in the same change unit.

## Routing

- Retry ownership, retry count, backoff, or error classification for an external dependency call: read [API Retry Policy](./retry.md).
- Per-attempt timeout, overall deadline, or deadline propagation across layers: read [API Timeout & Deadline Policy](./timeout-deadline.md).
- Message queue consumer retry, dead letter queue/redrive policy, or workflow/activity/saga retry: read [API Async & Workflow Retry Policy](./async-workflow-retry.md).
- Circuit breaker state transitions, breaker scope, or circuit breaker composition with retry: read [API Circuit Breaker Policy](./circuit-breaker.md).
- Natural-idempotency criteria, idempotency key generation/storage, or server-side deduplication for a retried mutation: read [API Idempotent Receiver Policy](./idempotent-receiver.md).
- Retry budget ratio, budget window, or how retry budget composes with per-call retry and circuit breaker: read [API Retry Budget Policy](./retry-budget.md).
- Database transaction retry loop structure, ownership, or how it composes with circuit breaker and retry budget: read [API Transaction Retry Policy](./transaction-retry.md).

- A policy draft covering the remaining topics exists at `.claude/temp/retry-resilience-policy.ko.md` but has not been finalized as a convention document.
- Once a topic is finalized, add a routing entry here in the same style as the parent [API Convention Index](../../index.md), for example:
  - Bulkhead, fallback, graceful degradation, or health-check-based failover policy: read the relevant document (link once created).
