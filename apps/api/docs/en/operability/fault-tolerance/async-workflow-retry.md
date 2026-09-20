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
- Retry budget, idempotency, and observability are separate fault-tolerance concerns that each have their own document.
  - Read [API Retry Budget Policy](./retry-budget.md), [API Idempotent Receiver Policy](./idempotent-receiver.md), and [API Observability Convention](../observability.md).
- Circuit breaker has no convention document yet.
  - Read [API Fault Tolerance Index](./index.md) for its current status.
- This document states general principles, except where a section names the concrete mechanism this project has already chosen, as [Outbox Relay Retry](#outbox-relay-retry) does. Add concrete configuration or thresholds for a mechanism only once its implementation decision has been made.

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
- This plays the same role in messaging that [Max Retry](./retry.md#max-retry) plays for a single request: give up and hand off instead of retrying indefinitely.

### Outbox Relay Retry

- The outbox relay owns the retry for an integration event's delivery. No other layer repeats that delivery, and the relay does not wrap the dispatcher call in an adapter-level retry of its own.
  - A relay attempt re-runs everything the dispatch triggers, not only a network send, because the in-process dispatcher runs its listeners synchronously. Treat one relay attempt as a workflow-level retry in the sense of [Exception: Workflow-Level Retry](./retry.md#exception-workflow-level-retry).
- Claim an event before dispatching it: increment its attempt count and push its next attempt time forward in the same statement, and skip rows another instance is already holding.
  - Claiming before dispatch is what makes the relay safe to run on more than one instance. Selecting without claiming lets two instances dispatch the same event.
  - The pushed-forward next attempt time doubles as a lease: a process that crashes mid-dispatch releases nothing, and the event becomes claimable again once the lease expires.
- Space retries with exponential backoff and full jitter using the formula in [Backoff And Jitter](./retry.md#backoff-and-jitter). The polling interval decides how often due events are checked, never how long a failed delivery waits.
- Isolate an event that has failed `maxAttempts` times by marking it dead-lettered instead of retrying it forever.
  - A dead-lettered event stays in the outbox table and is excluded from the claim query. It is not moved to a separate table or queue: the table is the queue, so a state column achieves the isolation that moving a message achieves in a broker.
  - Redrive is a deliberate manual decision, not an automatic one:

```sql
UPDATE outbox_messages SET dead_lettered_at = NULL, attempt_count = 0, next_attempt_at = now()
WHERE event_id = '...'
```

- Current values:

```ts
maxAttempts: 14
baseDelayMs: 1_000
maxDelayMs: 600_000
claimLeaseMs: 30_000
batchSize: 100
```

- These values put the isolation window at roughly 57 minutes at most, and roughly half that on average because full jitter halves the expected wait. The window is chosen so that an infrastructure outage shorter than about an hour does not dead-letter healthy events.
- Do not treat these values as fixed constants, for the same reason [Backoff And Jitter](./retry.md#backoff-and-jitter) gives: measure and tune them from observed data, and revisit them when the dispatch path's behavior changes.
- Publish a dead-letter notification as its own integration event, and let each bounded context decide how to compensate for an event it owns. The relay cannot know what a dead-lettered event means.
  - The notification is best-effort and is not itself written to the outbox, which would be circular. The dead-letter column is the durable record.
- Log a scheduled retry at `warn` and a dead-letter at `error`, per [API Logging Policy](../logging.md). Include:

```text
eventId
eventType
attempt
maxAttempts
delayMs
retryAllowed
retryBlockedReason
```

  - These are the [Observability](./retry.md#observability) fields of [API Retry Policy](./retry.md) named for an event rather than a dependency call. The error's own type and stack come from the logging adapter, so do not duplicate them as retry fields.

### Embedding Chunk Job Retry

- A chunk job owns the retry for the embedding call it makes. The embedder's own per-call retry is disabled for calls made inside the job (`maxRetries: 0`), as [Exception: Workflow-Level Retry](./retry.md#exception-workflow-level-retry) requires, so the two counts cannot multiply.
- Retry the failed chunk rather than the workflow. The job that failed is the only one repeated; sibling chunks that already succeeded keep their results, and the parent collects them when the retry completes.
  - This is what the flow makes possible and a caller-side re-upload does not: re-sending the whole source produces a new sync job id, so every chunk is embedded again.
- A parent marked `failParentOnFailure` is failed by its child only once that child has exhausted its attempts, not on the child's first failure. A retry left on the child moves it to delayed instead of finishing it, and the parent is not touched.
- The queue's own `failed` event fires on every attempt, including ones that will be retried. Treat an attempt as terminal only when `attemptsMade` has reached the job's `attempts`; acting earlier reports the whole sync job as failed while retries are still pending.
- Current values:

```ts
attempts: 3
backoff: { type: 'exponential', delay: 1_000, jitter: 1 }
```

- `jitter: 1` makes the broker's exponential backoff span the full `[0, delay * 2 ** (attempt - 1)]` range, which is the full-jitter formula [Backoff And Jitter](./retry.md#backoff-and-jitter) requires. The formula's `maxDelay` clamp is left out because three attempts cannot reach it.
- Three attempts is the count [Max Retry](./retry.md#max-retry) gives a background job.

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
