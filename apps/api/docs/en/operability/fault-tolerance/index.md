---
title: API Fault Tolerance Index
lang: en
audience: both
applies_to:
  - apps/api
translation: ../../../ko/operability/fault-tolerance/index.md
related: []
---

# API Fault Tolerance Index

## Purpose

This index groups `apps/api` conventions for handling failures when calling external dependencies (external APIs, LLMs, network calls, queues): retry, timeout/deadline, retry budget, circuit breaker, and related mechanisms (bulkhead, fallback, graceful degradation, health-check-based failover) as they are formalized into convention documents.

## Synchronization Policy

English and Korean `apps/api` fault-tolerance documents are paired documents that should describe the same policy.
When they conflict, choose the intended policy from either language and update both documents in the same change unit.

## Routing

No fault-tolerance sub-document has been promoted into this index yet.

A retry/backoff/timeout/circuit-breaker policy draft exists at `.claude/temp/retry-resilience-policy.ko.md` but has not been finalized as a convention document. Once it (or any other fault-tolerance topic) is finalized, add a routing entry here in the same style as the parent [API Convention Index](../../index.md), for example:

- Retry, backoff, timeout/deadline, retry budget, or circuit breaker policy: read API Retry & Resilience Policy (link once created).
- Bulkhead, fallback, graceful degradation, or health-check-based failover policy: read the relevant document (link once created).