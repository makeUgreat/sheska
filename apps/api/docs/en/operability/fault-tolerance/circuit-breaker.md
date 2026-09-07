---
title: API Circuit Breaker Policy
lang: en
audience: both
applies_to:
  - apps/api
translation: ../../../ko/operability/fault-tolerance/circuit-breaker.md
read_when:
  - Defining, implementing, or reviewing circuit breaker state transitions, breaker scope, or how a circuit breaker composes with retry for calls to an external dependency.
related:
  - ./index.md
  - ./retry.md
---

# API Circuit Breaker Policy

- A circuit breaker stops calling a dependency that is already failing broadly, instead of letting every caller find that out independently.

## Scope

- Use this document when deciding circuit breaker state transitions, what a breaker is scoped to, or how it composes with retry.
- Retry ownership, retry count, backoff, and error classification are defined in [API Retry Policy](./retry.md), not by this document.
- Retry budget, idempotency, and observability are separate fault-tolerance concerns not yet promoted into a convention document.
  - Read [API Fault Tolerance Index](./index.md) for their current status.

## Why A Circuit Breaker

- When a dependency is failing broadly rather than for one request, retrying each failed call independently still sends load into a dependency that cannot serve it.
  - This delays dependency recovery and wastes callers' time on calls likely to fail anyway.
  - See [API Retry Policy](./retry.md) for the per-call retry rules.
- A circuit breaker tracks failures across calls to a dependency and stops issuing new calls once failures cross a threshold, instead of letting every caller discover the outage on its own.

## Breaker Granularity

- Scope a circuit breaker to one external dependency (one API, one LLM provider, one downstream service), not to an entire application and not to an individual request.
  - A breaker scoped too broadly trips on failures unrelated to the dependency it is meant to protect. A breaker scoped too narrowly cannot observe enough failures to detect a real outage.

## State Machine

- A circuit breaker has three states:

```text
closed -> open -> half-open -> closed
```

- `closed`: call the dependency normally, and monitor the failure rate.
- `open`: fail immediately without calling the dependency at all.
- `half-open`: allow a small number of trial calls through to check whether the dependency has recovered.
  - On success, return to `closed`. On continued failure, return to `open`.

## Composition With Retry

- Place the circuit breaker outside the retry policy, not inside it:

```text
circuit breaker -> retry policy -> actual call
```

- When the breaker is `open`, [API Retry Policy](./retry.md) never runs for that call, because the call fails immediately before retry logic is reached.
- Do not let retry consume the limited trial calls allowed in `half-open`.
  - A `half-open` trial call exists to detect recovery.
  - Retrying a `half-open` trial call defeats that purpose and can trip the breaker back to `open` based on retry noise rather than the dependency's real state.

## Thresholds Are Tuned, Not Fixed

- Do not treat the failure-rate threshold, evaluation window, minimum request count, or open duration as fixed constants.
  - These values depend heavily on the target dependency's baseline traffic volume and normal failure rate.
  - Measure and tune these values from observed data instead of fixing them once.
- Revisit the values when the dependency's behavior changes (for example, a traffic volume change or a shift in its normal failure rate), rather than treating them as set once.
