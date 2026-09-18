---
title: API Retry Budget Policy
lang: en
audience: both
applies_to:
  - apps/api
translation: ../../../ko/operability/fault-tolerance/retry-budget.md
read_when:
  - Defining, implementing, or reviewing a limit on the total retry traffic a dependency receives across all callers, or deciding how retry budget composes with per-call retry.
related:
  - ./index.md
  - ./retry.md
---

# API Retry Budget Policy

- A retry budget caps how much extra traffic retries can add to a dependency across all callers, independent of any single call's retry count.

## Scope

- Use this document when deciding the retry budget ratio, the window it is measured over, or how retry budget composes with per-call retry.
- Retry ownership, per-call retry count, backoff, and error classification are defined in [API Retry Policy](./retry.md), not by this document.
- Idempotency and observability conventions shared across fault-tolerance topics are defined in [API Retry Policy](./retry.md) and referenced here, not duplicated.

## Why A Retry Budget

- [API Retry Policy](./retry.md) bounds how many times a single call is retried, but it does not bound how much retry traffic the system as a whole sends to a dependency.
  - When a dependency degrades, many independent callers retry at once. Each caller's retry count looks reasonable in isolation, but the combined retry traffic can exceed what the degraded dependency can serve, delaying its recovery.
- A retry budget addresses the traffic-volume problem directly, as a ratio of original traffic rather than as a failure-rate threshold.
  - Retries can already be adding disproportionate load well before the dependency's failure rate is high enough to read as an outage, so a limit expressed in failure rate would not catch it.

## Budget Policy

- Limit retry traffic to a fixed ratio of original (non-retry) request traffic, measured over a sliding window, scoped per dependency:

```ts
retryBudgetRatio: 0.1 // retry attempts <= 10% of original attempts
retryBudgetWindowMs: 60_000
```

- Only count an attempt against original traffic once, on the first attempt of a call. Count every subsequent retry attempt against the retry budget, not against original traffic.
- Track the budget per dependency. A budget scoped to the whole application lets one degraded dependency's retries consume budget meant for healthy dependencies.

## When The Budget Is Exhausted

- When a call would retry but the dependency's retry budget for the current window is exhausted, fail that call immediately instead of retrying.
- Do not queue or delay the call waiting for budget to free up. A blocked retry still holds caller resources and defeats the purpose of bounding load.
- Record the exhaustion per [Observability](#observability) so the caller and operator can distinguish "retry budget exhausted" from "retries ran and failed."

## Composition With Retry

- Evaluate retry budget before evaluating per-call retry, outside the retry loop:

```text
retry budget -> retry policy -> actual call
```

- If the retry budget is exhausted, the call fails before [API Retry Policy](./retry.md)'s per-call retry loop runs.
- A call that is retried under [API Retry Policy](./retry.md)'s `maxRetries` still consumes retry budget for each attempt beyond the first. Reaching `maxRetries` for a single call and exhausting the dependency's retry budget are independent stop conditions; either one halts further retry of that call.

## Ratio And Window Are Tuned, Not Fixed

- Do not treat `retryBudgetRatio` or `retryBudgetWindowMs` as fixed constants: they depend on the target dependency's baseline traffic volume and normal failure rate, which vary by dependency.
  - Measure and tune these values from observed data instead of fixing them once.
  - Revisit the values when the dependency's behavior changes (for example, a traffic volume change or a shift in its normal failure rate).

## Observability

- This section defines only retry-budget-specific content. Whether to log an event and at what level follows [API Logging Policy](../logging.md); how logs and metrics are shipped follows [API Observability Convention](../observability.md).
- Retry-specific structured log fields and metrics not specific to budget are defined in [Observability](./retry.md#observability) in [API Retry Policy](./retry.md) and are not duplicated here.

### Structured Log Fields

- A log record for a retry-budget decision includes:

```text
dependency
operation
retryBudgetRatio
retryBudgetWindowMs
retryBudgetRemaining
retryBudgetExhausted
```

### Metric

- Track at least the following per dependency:

```text
retry_budget_consumed_total
retry_budget_exhausted_total
```