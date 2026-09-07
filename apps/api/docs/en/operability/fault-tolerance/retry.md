---
title: API Retry Policy
lang: en
audience: both
applies_to:
  - apps/api
translation: ../../../ko/operability/fault-tolerance/retry.md
read_when:
  - Defining, implementing, or reviewing retry ownership, retry count, backoff, or which errors are retryable for calls to an external dependency (external API, LLM, network call, queue).
related:
  - ./index.md
  - ./timeout-deadline.md
  - ./async-workflow-retry.md
  - ./circuit-breaker.md
  - ./idempotent-receiver.md
  - ../error.md
  - ../logging.md
  - ../observability.md
---

# API Retry Policy

- Retry decides whether and how a failed call to an external dependency is repeated.

## Scope

- Use this document when deciding who retries, how many times, with what delay, and for which errors.
- Timeout/deadline is defined in [API Timeout & Deadline Policy](./timeout-deadline.md), not by this document.
- Circuit breaker composition is defined in [API Circuit Breaker Policy](./circuit-breaker.md), not by this document.
- Retry budget is a separate fault-tolerance concern not yet promoted into a convention document.
  - It interacts with retry (see [Interaction With Other Fault-Tolerance Concerns](#interaction-with-other-fault-tolerance-concerns)).
  - Read [API Fault Tolerance Index](./index.md) for their current status.
- Idempotency's mutation-retry gate is defined in [Retryable Errors](#retryable-errors). The broader idempotent-receiver policy (natural-idempotency criteria, idempotency key generation, storage, and deduplication) is defined in [API Idempotent Receiver Policy](./idempotent-receiver.md), not by this document.
- The structured log fields and metrics a retry decision must produce are defined in [Observability](#observability), not by this bullet list.
  - Whether to log an event and at what level is governed by [API Logging Policy](../logging.md); how logs and metrics are transported is governed by [API Observability Convention](../observability.md). This document only defines retry-specific content.

## Retry Ownership

- Own retry at the client or adapter layer that directly calls the external dependency, not at an upper layer.
  - A single request path must have exactly one retry owner. Multiple layers retrying the same failure causes retry amplification.
- An upper layer (application layer use case, or presentation layer entry point such as an HTTP controller or queue consumer) delegates to the client/adapter layer's retry policy instead of building its own retry loop.
  - Exception: an upper layer may retry when the unit of work is a whole workflow that only makes sense to re-run as a whole, not a single external call.
    - Example: a saga or orchestration step that must be re-run atomically is retried by the saga/orchestrator, not by retrying one call inside it.
    - Example: a BullMQ job-level retry (see the queue retry policy draft at `.claude/temp/embed-queue-retry-policy.ko.md`) re-runs the whole job, not just the external call that failed inside it.
    - See [API Async & Workflow Retry Policy](./async-workflow-retry.md) for consumer retry, dead letter queue/redrive policy, workflow/activity retry, and saga retry in detail.
  - When this exception applies, disable the client/adapter layer's own retry (`maxRetries: 0`) for external calls made inside the workflow-level retry attempt.
  - Do not let workflow-level retry and client/adapter-level retry apply to the same call at the same time.
    - The two counts multiply (for example, 3 workflow attempts x 3 adapter attempts = up to 9 calls), producing a far higher effective retry count than either layer intends on its own.

## Max Retry

- Default to `maxRetries: 2` (3 total attempts) for a call to an external dependency.
- Choose fewer retries when a failed attempt is costly, non-idempotent, or the caller is time-sensitive. Choose more retries when attempts are cheap, safely repeatable, and the caller can absorb extra time.

| Call category | Max retry |
|---|---:|
| Internal/local operation | 0 |
| Read-only external call (GET, metadata fetch, polling, LLM read) | 2, or 3-5 for polling bounded by a deadline |
| Mutation (`POST`/`PUT`/`PATCH`/`DELETE`) | 0, or 1 with an idempotency key |
| Background job (queue consumer or scheduled job) | 3, with strict retry budget enforcement |

## Backoff And Jitter

- Space out retries so they do not add to the load on a dependency that is already struggling.
  - A growing delay between attempts (exponential backoff) avoids hammering a slow or failing dependency.
  - Randomizing that delay (jitter) avoids many callers retrying in the same instant (a retry storm).
- Use exponential backoff with full jitter:

```ts
delay = random(0, min(maxDelay, baseDelay * 2 ** attempt))
```

- Do not treat `baseDelay` and `maxDelay` as fixed constants.
  - These values depend heavily on the target dependency's actual latency and failure-recovery behavior.
  - Measure and tune these values from observed data instead of fixing them once.
  - Revisit the values when the dependency's behavior changes (for example, a slower downstream, a new rate limit, or a different traffic pattern), rather than treating them as set once.
- Prefer a `Retry-After` response header over the computed delay when the response includes one.
- Do not retry when the delay would exceed the time remaining until the call chain's deadline.
  - See [API Timeout & Deadline Policy](./timeout-deadline.md) for what a deadline is and how it is propagated across layers.

## Retryable Errors

### Mutation Safety Gate

- This gate overrides every classification below: retry a mutation (`POST`/`PUT`/`PATCH`/`DELETE`, or any call with a side effect) only when it is idempotent, regardless of what error it failed with.
  - An error classified as retryable by the sections below must still not be retried on a non-idempotent mutation.
- A mutation is idempotent naturally, or made idempotent by an idempotent-receiver mechanism the server checks before applying the effect.
  - See [API Idempotent Receiver Policy](./idempotent-receiver.md) for what counts as naturally idempotent and how an idempotent receiver works.
- When a mutation needs to be retried but is not naturally idempotent, make it idempotent (see [API Idempotent Receiver Policy](./idempotent-receiver.md)) instead of retrying it unsafely.
- See [Max Retry](#max-retry) for how this gate is reflected as a retry count per call category.

### Network-Level Classification

- Most retry decisions are about network-facing failures: a timeout, a 5xx response, or a dropped connection.
- Treat a failure as retryable when it is likely transient and retrying has a reasonable chance of succeeding without making the problem worse.
  - Retryable network-level failures include cases where the request never reached the server.
  - Retryable network-level failures include cases where the server failed to complete the request due to a temporary condition.
  - Retryable network-level failures include cases where the server explicitly signals that a retry is expected.
  - Representative examples:

```text
TimeoutError
NetworkError
429
5xx (502, 503, 504)
```

- Treat a failure as non-retryable when the outcome would not change on retry.
  - Non-retryable failures include invalid requests, missing authentication or permission, and missing targets.
  - Retrying these wastes the attempt and can hide the real problem.
  - Representative examples:

```text
4xx other than 408/429
validation error
authentication or permission error
user cancellation
```

### Database Transaction Conflict Classification

- A database transaction conflict is a different kind of failure from the network-level failures above.
  - The server responded normally, but the transaction failed because it conflicted with another transaction running concurrently.
  - A database transaction conflict is not a client error or a server outage.
  - The network-level classification above (4xx/5xx-based) does not apply to it.
- Retry the whole transaction, or the whole multi-step unit of work it belongs to, from the start rather than retrying part of it.
  - This is safe because a failed transaction rolls back in full with no partial effect. This is a different safety guarantee than idempotency: idempotency makes repeated execution produce the same result, while transaction atomicity makes a failed attempt have no effect at all.
- Treat a database-reported concurrency conflict (for example, a serialization failure under `SERIALIZABLE` isolation, or a deadlock) as retryable.
  - The database signals these explicitly, through a driver exception or a vendor-specific error code. Recognize that signal instead of guessing from a generic error message.
- Treat an application-checked optimistic-concurrency conflict as retryable too, after re-reading the latest data.
  - This is a version or timestamp check failing at write time, detected by the application itself rather than signaled by the database, typically because the write affected zero rows instead of raising an error.
  - When the operation is read-modify-write, retry from the read step, not just the write. Retrying only the write reproduces the same conflict, because it is still based on stale data.
- Do not treat a data constraint violation (a unique or foreign key violation) as retryable.
  - It resembles the same category of database error as a concurrency conflict, but it is caused by the data itself, not by concurrent execution, so retrying cannot fix it.

## Observability

- Retry decisions are hard to debug in production without structured logs and metrics. Produce them at the point where this document's rules decide whether, when, and how to retry.
- This section defines retry-specific content only. Whether to log an event and at what level is governed by [API Logging Policy](../logging.md); how logs and metrics are transported is governed by [API Observability Convention](../observability.md).

### Structured Log Fields

- Include the following fields on a log record for a retry decision:

```text
dependency
operation
attempt
maxRetries
delayMs
errorType
statusCode
deadlineRemainingMs
retryAllowed
retryBlockedReason
```

- `retryAllowed` and `retryBlockedReason` record why a retry did or did not happen (for example, blocked by the [Mutation Safety Gate](#mutation-safety-gate) or by an exhausted deadline), not just the fact that one did.

### Metrics

- Track at least the following per dependency:

```text
request_total
request_failed_total
retry_attempt_total
retry_exhausted_total
request_duration_ms
```

- Circuit breaker state and transitions have their own metrics, defined in [API Circuit Breaker Policy](./circuit-breaker.md), not duplicated here.
- Retry budget metrics will be added here once retry budget itself is promoted into a convention document.

## Interaction With Other Fault-Tolerance Concerns

- A retry policy alone is not a complete resilience strategy.
  - Timeout/deadline, circuit breaker composition, the idempotency mutation-retry gate and its idempotent-receiver mechanism, and retry observability are already covered elsewhere.
  - See [Backoff And Jitter](#backoff-and-jitter), [Retryable Errors](#retryable-errors), [Observability](#observability), [API Circuit Breaker Policy](./circuit-breaker.md), and [API Idempotent Receiver Policy](./idempotent-receiver.md).
- It also composes with a concern not yet promoted into a convention document:
  - Retry budget: limits how much total retry traffic the system generates, independent of any single call's `maxRetries`.
- Do not implement this ad hoc based on this document alone. Check [API Fault Tolerance Index](./index.md) for its promotion status before relying on undocumented behavior.
