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
  - ./idempotent-receiver.md
  - ./retry-budget.md
  - ./transaction-retry.md
  - ../error.md
  - ../logging.md
  - ../observability.md
---

# API Retry Policy

- Retry decides whether and how a failed call to an external dependency is repeated.

## Scope

- Use this document when deciding who retries, how many times, with what delay, and for which errors.
- Timeout/deadline is defined in [API Timeout & Deadline Policy](./timeout-deadline.md), not by this document.
- Retry budget ratio, budget window, and how retry budget composes with per-call retry are defined in [API Retry Budget Policy](./retry-budget.md), not by this document.
- Idempotency's mutation-retry gate is defined in [Retryable Errors](#retryable-errors). The broader idempotent-receiver policy (natural-idempotency criteria, idempotency key generation, storage, and deduplication) is defined in [API Idempotent Receiver Policy](./idempotent-receiver.md), not by this document.
- The structured log fields and metrics a retry decision must produce are defined in [Observability](#observability), not by this bullet list.
  - Whether to log an event and at what level is governed by [API Logging Policy](../logging.md); how logs and metrics are transported is governed by [API Observability Convention](../observability.md). This document only defines retry-specific content.

## Retry Ownership

- A single request path must have exactly one retry owner: exactly one layer repeats a given failed call.
  - Retry spends a dependency's capacity to raise one request's chance of success. That trade is cheap while failures are rare and transient, and harmful when the failure is caused by overload, because retries deepen the overload and hold load high after the original cause clears, delaying recovery.
  - Retry counts multiply along a call path instead of adding up. A call through a 5-layer stack that ends in a database query, with every layer retrying 3 times, sends up to 243x the load to the database once the database starts failing, which makes recovery practically impossible.
- Fix the retry owner at design time and leave retry code out of every other layer on the path.
  - Fixed ownership is simple to reason about and can be verified by reading the code on the path.
  - The alternative is signaled ownership: the layer directly above the failure retries, and when it gives up it propagates an explicit "overloaded; do not retry" signal that stops every layer above it from retrying. Signaled ownership wastes no completed work and still avoids multiplication, but it only holds when every layer on the path understands and honors the signal, so it is not available on a path that crosses code this project does not control.

### Retries Already Enabled On The Path

- Audit the whole call path for retries that are already enabled, and disable them everywhere except the retry owner, before tuning any retry value.
  - Choosing a retry count is meaningless while a second layer on the same path silently retries the same failure, because the two counts multiply.
  - The multiplication is hard to see: the retry this project wrote is visible in its own code, while the factor it multiplies with is usually code this project did not write.
- Check at least the following for retry enabled by default:

```text
HTTP client library or vendor SDK defaults
service mesh or sidecar proxy retry policy
load balancer or gateway retry
message queue redelivery
browser or mobile client automatic re-request
offline sync protocol
```

### Where The Owner Sits

- Own retry at the client or adapter layer that directly calls the external dependency, not at an upper layer.
  - The client/adapter layer is the layer closest to the failure, so a retry there discards no work already completed above it, requires only that layer's call to be idempotent, and is made with the most precise information about the failure.
- An upper layer (application layer use case, or presentation layer entry point such as an HTTP controller or queue consumer) delegates to the client/adapter layer's retry policy instead of building its own retry loop.
  - Splitting the decision: the caller owns the retry budget (how many attempts and how long it can wait), while the client/adapter owns the retry loop and the error classification (which failures are worth repeating).
    - Carry the budget on the same call context that already carries the deadline, rather than hardcoding it in the adapter. One adapter instance often serves callers with very different time budgets, and a single hardcoded value cannot fit both.
    - Keep the error classification in the adapter. Which failures are transient is knowledge about the dependency, not about the caller.
    - This is not the upper-layer retry loop this section forbids: the caller supplies values, it does not repeat the call itself.
- Revisit this placement for a specific call path when the axes below point the other way. The same failure retried at a different layer changes all of the following:

| Axis | Retry at an upper layer | Retry at the layer closest to the failure |
|---|---|---|
| Discarded work | Large: every layer above re-runs its work | None: only the failed call is repeated |
| Repeated side effects | Every intermediate layer must be idempotent | Only the layer closest to the failure must be idempotent |
| Resource occupancy | Short and shallow | Long and deep: the whole chain waits for the attempts and the backoff between them |
| Path diversity | A re-sent request can be routed to a different instance | The already-established connection and instance is used again |
| Information for the decision | Usually a flattened error, such as a single 500 | The precise failure cause, such as connection refused, query timeout, deadlock, or overload rejection |
| Visibility | Visible to the caller | Hidden from the caller |

- Own retry at the layer closest to the failure when:
  - work already completed by the layers above is expensive or has side effects, because an upper-layer retry re-runs and repeats all of it.
  - the failure is confined to one downstream dependency, because re-sending the whole request buys nothing the closer retry does not already get.
  - the retry finishes quickly without a long backoff, because a deep retry holds every layer above it for as long as it runs.
- Own retry at an upper layer when:
  - the call chain is shallow and each layer is cheap, such as a low-cost control-plane or data-plane operation, because little completed work is discarded.
  - the downstream is replicated across instances, so routing a re-sent request to a different instance is worth something.
  - the whole path is idempotent, because every intermediate layer's side effects repeat on each attempt.
  - a long backoff is needed, because a deep retry holds a thread and connection at every layer above it until the deadline, which turns a failure in a small share of requests into a chain-wide outage.

### Exception: Workflow-Level Retry

- An upper layer may retry when the unit of work is a whole workflow that only makes sense to re-run as a whole, not a single external call.
  - Example: a saga or orchestration step that must be re-run atomically is retried by the saga/orchestrator, not by retrying one call inside it.
  - Example: a BullMQ job-level retry re-runs the whole job, not just the external call that failed inside it.
    - See [Embedding Chunk Job Retry](./async-workflow-retry.md#embedding-chunk-job-retry) for the chunk job this project runs that way.
  - Example: a database transaction that conflicts with a concurrent transaction is retried by re-running the whole transaction, not by retrying one statement inside it.
    - See [API Transaction Retry Policy](./transaction-retry.md) for how that retry loop is structured and owned.
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
- Keep the backoff short while the retry owner is the client/adapter layer, and reconsider the retry owner instead of stretching a deep backoff.
  - A backoff at the client/adapter layer holds a thread and a connection at every layer above it for the whole wait. The longer the backoff, the more that occupancy costs. See [Where The Owner Sits](#where-the-owner-sits).
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
- The idempotency this gate requires covers the whole unit of work that is repeated, not only the failed call.
  - A retry owned by an upper layer repeats every intermediate layer's side effects, so each of those layers must satisfy this gate. See [Where The Owner Sits](#where-the-owner-sits).
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

- Classify the failure at the layer that can still see its cause, which is the client/adapter layer that made the call.
  - The distinction between a client error and a server error blurs by the time the failure reaches an upper layer, where it is usually flattened into a single error.
  - Eventual consistency blurs the distinction further: a request rejected as a client error now can succeed moments later.

### Database Transaction Conflict Classification

- A database transaction conflict is a different kind of failure from the network-level failures above.
  - The server responded normally, but the transaction failed because it conflicted with another transaction running concurrently.
  - A database transaction conflict is not a client error or a server outage.
  - The network-level classification above (4xx/5xx-based) does not apply to it.
- Retry the whole transaction, or the whole multi-step unit of work it belongs to, from the start rather than retrying part of it.
  - This is safe because a failed transaction rolls back in full with no partial effect. This is a different safety guarantee than idempotency: idempotency makes repeated execution produce the same result, while transaction atomicity makes a failed attempt have no effect at all.
  - See [API Transaction Retry Policy](./transaction-retry.md) for how the retry loop itself is structured and owned.
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
- A retry owned by the client/adapter layer is invisible to the caller, so these fields are the only place the caller and the operator can see that a retry happened at all.

### Metrics

- Track at least the following per dependency:

```text
request_total
request_failed_total
retry_attempt_total
retry_exhausted_total
request_duration_ms
```

- Retry budget metrics are defined in [API Retry Budget Policy](./retry-budget.md), not duplicated here.

## Interaction With Other Fault-Tolerance Concerns

- A retry policy alone is not a complete resilience strategy.
  - Timeout/deadline, retry budget, the idempotency mutation-retry gate and its idempotent-receiver mechanism, database transaction retry, and retry observability are already covered elsewhere.
  - See [Backoff And Jitter](#backoff-and-jitter), [Retryable Errors](#retryable-errors), [Observability](#observability), [API Retry Budget Policy](./retry-budget.md), [API Idempotent Receiver Policy](./idempotent-receiver.md), and [API Transaction Retry Policy](./transaction-retry.md).
