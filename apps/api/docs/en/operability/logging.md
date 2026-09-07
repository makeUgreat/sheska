---
title: API Logging Policy
lang: en
audience: both
applies_to:
  - apps/api
translation: ../../ko/operability/logging.md
read_when:
  - Deciding whether to log, what to log, where to log, and at which log level.
related:
  - ./error.md
  - ./observability.md
  - ../architecture/architecture.md
---

# API Logging Policy

## Scope

- Use this document when deciding whether, where, and at which level to record an application event.
- Write a log only when it helps reconstruct an operation, understand its outcome, or decide whether action is needed.
- Follow the [observability convention](./observability.md) for log transport, export, and trace correlation.

## Log Categories

- Classify a log by the event it records.
  - Fault logs record operational failures and system errors.
  - Security logs record authentication, authorization, and access-control events.
  - Audit logs record business-significant state changes attributable to an actor.
  - Access logs record inbound and outbound request traffic.
- This document defines fault-log decisions only.

## Fault Log Decisions

- Classify an error before choosing whether and at which level to log it.
  - Follow the [error policy](./error.md) for error ownership and classification.
  - Error classification decides whether and at which level to log; it does not decide where to log.
- Do not turn every error into a fault log mechanically.

### Levels

- Use `error` for a terminal operational or system failure that requires investigation or action.
- Use `warn` for an operationally relevant failure that was recovered, degraded, or intentionally swallowed.
- Use `log` (info severity) or `debug` for useful context about expected outcomes that are not faults.
  - Choose `debug` when the context is primarily diagnostic and too detailed for normal operation.

### Error Classification

- Business errors are expected failures of a business rule, not system faults.
  - Do not log business errors at `error` level.
  - Logging business errors at `error` level pollutes the fault signal and makes real incidents harder to find.
  - Record operationally useful context at `log` or `debug` at the observable boundary.
- Classify an external error by its meaning, not only by its origin.
  - A vendor business-rule rejection is not a system fault and does not require a fault log.
  - A vendor or integration system failure requires a fault log.

## Observable Boundary

- Log once at the **observable boundary** — not at every layer an error passes through.
  - The observable boundary is where handling finishes instead of rethrowing the error.
  - Logging at every layer inflates metrics, duplicates alerts, and misrepresents incident counts.
- **Log or throw, not both.**
  - When rethrowing, add context and preserve `cause` without logging.

### Top-Level Boundary

- Log a propagated fault at the top-level handler that converts it into a final response or process outcome.
  - In the HTTP runtime, the global exception filter is the top-level observable boundary.

```typescript
try {
  await db.save(order);
} catch (cause) {
  throw new OrderPersistenceError('Failed to save order', { cause, orderId: order.id });
}
```

### Swallow Boundary

- Treat a catch point that does not rethrow as an observable boundary.
  - Log there only when the swallowed failure is operationally relevant under the level and classification rules.
  - Do not log a successfully recovered transient failure merely because it was caught.
  - A relevant swallowed failure cannot be logged later because it no longer propagates.

## Logging Dependencies

- Domain and application code MUST NOT depend on a concrete logger implementation.
- Top-level boundary logging belongs to middleware, interceptors, global exception handlers, or process handlers.
- A domain or application swallow boundary may use an injected logging contract.
  - The contract belongs to the appropriate kernel and is named by capability, such as `Logger`.
  - Runtime or platform wiring owns the concrete implementation.
  - Tests replace the contract with a test double.

```typescript
interface Logger {
  warn(message: string, context?: Record<string, unknown>): void;
}

class RetryingNotificationSender {
  constructor(private readonly logger: Logger) {}

  async sendBestEffort(notification: Notification): Promise<void> {
    try {
      await this.retryableSend(notification);
    } catch (cause) {
      this.logger.warn(
        'Notification delivery abandoned after retries',
        { cause, notificationId: notification.id },
      );
    }
  }
}
```
