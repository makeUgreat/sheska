---
title: API Timeout & Deadline Policy
lang: en
audience: both
applies_to:
  - apps/api
translation: ../../../ko/operability/fault-tolerance/timeout-deadline.md
read_when:
  - Defining, implementing, or reviewing a per-attempt timeout, an overall deadline, or deadline propagation across layers for a call chain that reaches an external dependency (external API, LLM, network call, queue).
related:
  - ./index.md
  - ./retry.md
---

# API Timeout & Deadline Policy

- Timeout and deadline both bound how long work is allowed to take, but they bound different things.

## Scope

- Use this document when deciding a per-attempt timeout, an overall deadline, or how a deadline is propagated across layers and process boundaries.
  - Do not treat a per-attempt timeout or an overall deadline as a fixed constant per call type.
  - Timeout and deadline values depend heavily on the target dependency's actual latency and failure behavior.
  - Measure and tune timeout and deadline values from observed data instead of fixing them once.
  - Revisit the values when the dependency's behavior changes (for example, a slower downstream, a new rate limit, or a different traffic pattern), rather than treating them as set once.
- Retry ownership, retry count, backoff, and error classification are defined in [API Retry Policy](./retry.md), not by this document.
- Retry budget, circuit breaker, idempotency, and observability are separate fault-tolerance concerns not yet promoted into a convention document.
  - Read [API Fault Tolerance Index](./index.md) for their current status.

## Timeout And Deadline Are Different Axes

- A timeout is a relative duration allowed for one attempt, at one layer, to complete (for example, "wait 5 seconds for this call").
- A deadline is an absolute point in time by which the entire call chain — every layer and every attempt, including retries — must finish (for example, "this must finish by 12:00:05.000").
- Do not treat a per-layer timeout as a substitute for a deadline.
  - When each layer independently starts its own relative timeout clock, a layer does not know how much time the layers above it already spent.
  - Example: an upper layer has already spent 3s of its own 5s budget before calling a lower layer. If the lower layer starts its own independent 5s timeout from zero, it may keep running for up to 5 more seconds even though only 2s of the upper layer's total budget remains. The two clocks disagree about how much time is actually left.
- A deadline avoids this by sharing one absolute time value across every layer, instead of letting each layer restart its own relative clock.

## Deadline Propagation

- The layer that first accepts a request (the top-level entry point for that call chain) computes the deadline once, as `deadlineAt = now + deadlineMs`.
- Within a single process, pass `deadlineAt` down through every in-process layer and call made within that call chain, instead of letting a lower layer compute its own deadline from scratch.
- Bound each layer's timeout for a single attempt by both:
  - its own per-attempt timeout, and
  - the time remaining until `deadlineAt`.
- Do not start a new attempt, retry, or wait when the time remaining until `deadlineAt` is not enough to complete a minimal attempt.

### Crossing A Process Or Network Boundary

- When a call crosses a process or network boundary, propagate the remaining duration (`remainingMs = deadlineAt - now`, computed right before the call), not the absolute `deadlineAt` timestamp.
  - `deadlineAt` is an absolute point in time on the sending process's own clock. Sending it as-is to another process assumes both processes agree on what time it is.
  - Clock skew between hosts breaks that assumption.
    - Examples include drift, an unsynchronized or misconfigured NTP client, and container/VM clock issues.
    - The same absolute `deadlineAt` value can look already expired, or far in the future, to a receiver whose clock disagrees with the sender's.
- The receiving service computes its own local `deadlineAt = its own now + received remainingMs` and uses that value for all of its own layers and any further boundary it crosses.
- Repeat this remaining-duration handoff at every process boundary the call chain crosses. Do not carry one absolute `deadlineAt` value unchanged across more than one process boundary.
- This policy does not depend on clock synchronization (e.g., NTP) for deadline correctness, because deadlines cross process boundaries as relative durations.
- Keep clock synchronization as an operational practice for log and trace correlation across services regardless.

## Interaction With Retry

- [API Retry Policy](./retry.md) must not compute a backoff delay, or start a new attempt, that would exceed the time remaining until `deadlineAt`.
- A retry attempt is one of the attempts this document's deadline bounds. Retry count and backoff delay are defined by [API Retry Policy](./retry.md), not by this document.
