---
title: API Async & Workflow Retry Policy
lang: en
audience: both
applies_to:
  - apps/api
translation: ../../../ko/operability/fault-tolerance/async-workflow-retry.md
read_when:
  - Defining, implementing, or reviewing retry behavior for a message queue consumer, a dead letter queue/redrive policy, or a multi-step workflow, activity, or saga.
related:
  - ./index.md
  - ./retry.md
---

# API Async & Workflow Retry Policy

- This document covers retry for work the caller is not waiting on synchronously: queue consumers, dead-letter handling, and multi-step workflow or saga execution.

## Scope

- Use this document when deciding retry behavior for a queue consumer, a dead letter queue (DLQ) or redrive policy, or a workflow, activity, or saga step.
- [API Retry Policy](./retry.md) and [API Timeout & Deadline Policy](./timeout-deadline.md) cover retry for a call where the caller waits synchronously within a bounded time.
- This document covers work that continues after the caller has already returned.
- Retry budget, circuit breaker, idempotency, and observability are separate fault-tolerance concerns not yet promoted into a convention document.
  - Read [API Fault Tolerance Index](./index.md) for their current status.
- This document states general principles only. Concrete mechanisms (specific broker/engine behavior, configuration, thresholds) are not yet defined here; add them once a specific implementation decision is made.

## Why This Is A Different Problem From Synchronous Retry

- Once work moves off a caller's synchronous path, no caller is waiting on a time budget for it.
  - This applies to queued messages and long-running workflows.
  - [Deadline propagation](./timeout-deadline.md) matters less here than it does for [synchronous retry](./retry.md).
- Instead, retry count matters more than retry time: the key question becomes how many failures to tolerate before giving up and isolating the work, not how long it is allowed to take.

## Message Processing Retry

### Consumer Retry

- A message or job that fails to process is redelivered rather than treated as done, so it can be retried later.
- Because redelivery can run the same message more than once, the operation it triggers must be safe to run more than once, or must track its own completion, when it is not naturally safe to repeat.

### Dead Letter Queue And Redrive Policy

- After a message has failed a defined number of times, isolate it rather than retrying it forever and blocking normal messages behind it (head-of-line blocking).
- This plays the same role in messaging that [Max Retry](./retry.md#max-retry) plays for a single request, and that a circuit breaker plays for a synchronous call chain: give up and hand off instead of retrying indefinitely.

## Workflow Retry

### Durable Execution

- Durable execution persists workflow state so a crashed process resumes from where it stopped instead of from the beginning.
- It is not itself a retry technique; it is the infrastructure that the two patterns below (workflow/activity retry and saga retry) depend on to know where to resume from.

### Workflow And Activity Retry

- Prefer retrying only the failed step within a workflow (a local retry) over retrying the whole workflow from the start (a global retry), because retrying the smaller unit loses less completed work and costs less.

### Saga Retry

- A saga spanning multiple services retries a failed step, and if retrying does not resolve it, undoes previously completed steps with a compensating transaction.
- Saga retry differs from the other patterns in this document because it must define what happens when retrying itself fails, not just how to retry.
  - There is no automatic cross-service rollback the way a single database transaction rolls back.
  - The compensating logic must be written explicitly.
