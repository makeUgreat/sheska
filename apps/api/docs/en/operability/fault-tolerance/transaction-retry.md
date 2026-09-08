---
title: API Transaction Retry Policy
lang: en
audience: both
applies_to:
  - apps/api
translation: ../../../ko/operability/fault-tolerance/transaction-retry.md
read_when:
  - Deciding how a database transaction retry loop is structured, which layer owns it, or how it composes with optimistic-concurrency re-reads, circuit breaker, and retry budget.
related:
  - ./index.md
  - ./retry.md
---

# API Transaction Retry Policy

- A transaction retry re-runs a whole database transaction, or the whole multi-step unit of work it belongs to, from the start after a conflict, as opposed to retrying a single external call.

## Scope

- Use this document when deciding how a transaction retry loop is structured, which layer owns it, how its backoff differs from network-level retry, or how it composes with circuit breaker and retry budget.
- What counts as a retryable database transaction conflict (a database-signaled concurrency conflict, an application-checked optimistic-concurrency conflict, or a non-retryable data constraint violation) is defined in [Database Transaction Conflict Classification](./retry.md#database-transaction-conflict-classification) in [API Retry Policy](./retry.md), not by this document.
- Network-level retry ownership, count, and backoff for external dependency calls are defined in [API Retry Policy](./retry.md), not by this document.

## Retry Ownership

- Own the retry at the layer that starts the transaction, typically the repository or persistence layer that calls `db.transaction(...)`.
- This is the concrete case of the "whole unit of work" exception already stated in [API Retry Policy's Retry Ownership](./retry.md#retry-ownership): a database transaction that conflicts with a concurrent transaction is retried by re-running the whole transaction, not by retrying one statement inside it.
- The retry loop re-runs the entire transaction callback, not just the statement that failed.
  - When the operation is read-modify-write, re-run from the read step, not just the write.
    - Retrying only the write still operates on stale data and reproduces the same conflict — this mirrors the read-modify-write rule in [Database Transaction Conflict Classification](./retry.md#database-transaction-conflict-classification).

## Backoff

- A database concurrency conflict resolves on a much shorter timescale than a network failure: the conflicting transaction has usually already committed or rolled back by the time a retry could run.
- Use a much smaller `baseDelay` than a network-level retry, or a minimal jitter with no growing backoff, just enough to avoid immediately re-colliding on the same hot row.
- Do not treat this delay as a fixed constant any more than [API Retry Policy treats `baseDelay`/`maxDelay` as fixed](./retry.md#backoff-and-jitter): measure actual conflict-resolution timing for the target table/workload and tune from there.

## Max Retry

- A transaction retry is cheap and short, unlike a network-level mutation retry that is gated to 0-1 attempts by the [Mutation Safety Gate](./retry.md#mutation-safety-gate).
  - A transaction's safety comes from atomicity (a failed attempt has no partial effect), not from idempotency, so it can afford more attempts than a non-idempotent network mutation.
- Do not fix the exact retry count here.
  - Tune it from observed conflict rates for the target table/workload, the same way [circuit breaker thresholds are tuned, not fixed](./circuit-breaker.md#thresholds-are-tuned-not-fixed).

## Composition With Circuit Breaker And Retry Budget

- Circuit breaker and retry budget apply to calls to an external dependency (see [API Circuit Breaker Policy](./circuit-breaker.md) and [API Retry Budget Policy](./retry-budget.md)).
  - A database transaction retry is not a call to an external dependency in that sense, so it is out of scope for both.
- Do not make an external call (another dependency, an external API) inside a transaction being retried this way.
  - Doing so holds database locks open for longer than necessary and couples an unrelated external failure to a database conflict retry; keep the transaction limited to database work.

## Observability

- This section defines transaction-retry-specific content only. Whether to log an event and at what level follows [API Logging Policy](../logging.md); how logs and metrics are transported follows [API Observability Convention](../observability.md).
- Retry-specific structured log fields and metrics not specific to transaction retry are defined in [Observability](./retry.md#observability) in [API Retry Policy](./retry.md) and are not duplicated here.

### Structured Log Fields

- Include the following fields on a log record for a transaction retry decision:

```text
table
operation
attempt
maxRetries
delayMs
conflictType
retryAllowed
retryBlockedReason
```

- `conflictType` records which case of [Database Transaction Conflict Classification](./retry.md#database-transaction-conflict-classification) triggered the retry (for example, `serialization_failure`, `deadlock`, or `optimistic_concurrency`).

### Metrics

- Track at least the following per table or unit of work:

```text
transaction_total
transaction_conflict_total
transaction_retry_attempt_total
transaction_retry_exhausted_total
```
