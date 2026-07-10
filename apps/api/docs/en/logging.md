---
title: API Logging Policy
lang: en
audience: both
applies_to:
  - apps/api
translation: ../ko/logging.md
read_when:
  - Deciding whether to log, what to log, where to log, and at which log level.
related:
  - ./error.md
  - ./architecture.md
---

# API Logging Policy

Logs are records of important events that occurred while the application was running, preserved for later review.

## Purpose

A log record is worth writing when it could help answer one or more of the following questions later:

- When did this occur?
- Where did it occur?
- What happened?
- Which request or operation was involved?
- How did the system handle it?
- Does the operator need to take action?

## Log Categories

Logs differ by nature and may carry different policies:

- **Fault logs**: operational failures and system errors that require attention.
- **Security logs**: authentication, authorization, and access control events.
- **Audit logs**: business-significant state changes traceable to a specific actor.
- **Access logs**: inbound and outbound request traffic records.

The rest of this document focuses on **fault logs**, specifically logging decisions when errors occur. The timing and format of security, audit, and access logs follow separate policies (TBD — add sections here when needed).

## When to Write Fault Logs for Errors

Not every error warrants a fault log entry. Mechanical "error → log" flow is an anti-pattern.

Classify errors before deciding whether to log and at which level. The classification below determines **whether to log and at what level** — it does not determine **where** to log. Location is governed by the [Observable Boundary](#observable-boundary) section below.

### Business Errors

Business errors are predictable failures where the business rule was not satisfied. They are not faults.

Examples:
- Insufficient balance
- Coupon conditions not met
- Order already cancelled
- Reservation time unavailable

Do not write fault logs (error level) for business errors. Doing so pollutes the fault signal and makes real incidents harder to find. If the input context is operationally useful, record it at a lower level (info/debug) — but still at the observable boundary, not at the point of occurrence.

### External Errors

External errors originate outside the application and vary in nature. Log decisions depend on their character:

- **Vendor business rule rejection**: the vendor refused the request according to its own business rules. This is not a system fault; do not write a fault log.
- **System failure**: a failure in the vendor system or the integration layer itself. Write a fault log.

## Observable Boundary

Log once at the **observable boundary** — not at every layer an error passes through.

**Why**: logging at each layer (the log-and-throw anti-pattern) produces N log entries for a single event. This inflates metrics, triggers duplicate alerts, and creates misleading incident counts.

**Definition**: the boundary is the point where the error is finally handled rather than rethrown. "Observable" means within the scope our application can know about. This definition yields two forms.

### Type 1 — Top-Level Boundary (Normal Case)

The error keeps propagating via rethrow until it reaches the top of the application. In a web server, the global exception filter typically serves this role.

```
PaymentService → PaymentVendorClient → HttpClient
```

If `HttpClient` times out, `PaymentVendorClient` wraps it as `VendorTimeoutError`, and `PaymentService` wraps that as `PaymentFailedError`. Logging at each point produces three entries for one event. Log once at the global exception filter instead.

**Log or throw — not both.** When rethrowing an error, do not log it. Add context to the error and rethrow.

```typescript
try {
  await db.save(order);
} catch (cause) {
  // Do not log here. Wrap with context and rethrow.
  throw new OrderPersistenceError('Failed to save order', { cause, orderId: order.id });
}
```

### Type 2 — Swallow Boundary (Exceptional Case)

When a layer catches an error and does not rethrow it — a non-critical failure that is intentionally ignored, or a retry loop where a later attempt succeeded — this point also qualifies as an observable boundary by definition ("finally handled, not rethrown"). The error will not propagate further, so **this is the only opportunity to make it observable**. Failing to log here causes the event to disappear from the record permanently.

A swallow boundary often sits inside a domain or application layer, unlike Type 1. How to log in that case is covered by the [Separation of Concerns](#separation-of-concerns) section below.

## Separation of Concerns

Domain and application code must not depend on a concrete logger implementation. Logging is a cross-cutting concern.

- Code that rethrows an error throws a typed error with context. It does not log.
- Top-level boundary logging (Type 1) is handled exclusively by middleware, interceptors, or global exception handlers.
- When a swallow boundary (Type 2) sits inside a domain or application layer, that layer accepts an injected **logging port** (interface) instead of a concrete logger. The infrastructure layer owns the implementation; domain code substitutes a mock in tests.

```typescript
interface LoggingPort {
  warn(context: Record<string, unknown>, message: string): void;
}

class RetryingNotificationSender {
  constructor(private readonly logging: LoggingPort) {}

  async sendBestEffort(notification: Notification): Promise<void> {
    try {
      await this.retryableSend(notification);
    } catch (cause) {
      // Swallow boundary: no further propagation, so capture observability here.
      this.logging.warn(
        { cause, notificationId: notification.id },
        'Notification delivery abandoned after retries',
      );
    }
  }
}
```

This keeps domain code pure and testable while ensuring errors at swallow boundaries do not disappear unobserved.