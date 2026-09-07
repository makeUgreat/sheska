---
title: API Fault Tolerance 인덱스
lang: ko
audience: both
applies_to:
  - apps/api
source: ../../../en/operability/fault-tolerance/index.md
last_synced: 2026-09-07
related:
  - ./retry.md
  - ./timeout-deadline.md
  - ./async-workflow-retry.md
  - ./circuit-breaker.md
  - ./idempotent-receiver.md
---

# API Fault Tolerance 인덱스

## 목적

이 인덱스는 외부 의존성(외부 API, LLM, 네트워크 호출, 큐) 호출 실패를 다루는 `apps/api` 컨벤션들을 묶는다: retry, timeout/deadline, 비동기/workflow/saga 재시도, circuit breaker, idempotent receiver, retry budget, 그리고 앞으로 정식 컨벤션 문서로 확정될 bulkhead, fallback, graceful degradation, health-check 기반 failover 등의 메커니즘.

## 동기화 정책

영어와 한글 `apps/api` fault-tolerance 문서는 같은 정책을 설명하는 쌍 문서다.
두 문서가 충돌하면 영어와 한글 중 의도한 정책을 선택하고 같은 변경 단위에서 양쪽 문서를 모두 수정한다.

## 라우팅

- 외부 의존성 호출에 대한 재시도 소유권, 재시도 횟수, backoff, error classification 결정: [API 재시도 정책](./retry.md)을 읽는다.
- per-attempt timeout, 전체 deadline, 계층 간 deadline propagation 결정: [API Timeout & Deadline 정책](./timeout-deadline.md)을 읽는다.
- 메시지 큐 consumer 재시도, dead letter queue/redrive policy, workflow/activity/saga 재시도 결정: [API 비동기 & Workflow 재시도 정책](./async-workflow-retry.md)을 읽는다.
- circuit breaker 상태 전환, breaker 범위, circuit breaker와 재시도 조합 결정: [API Circuit Breaker 정책](./circuit-breaker.md)을 읽는다.
- 자연적 멱등성 판단 기준, idempotency key 생성/저장, 재시도되는 mutation의 서버 측 중복 제거 결정: [API Idempotent Receiver 정책](./idempotent-receiver.md)을 읽는다.

retry budget은 아직 별도 하위 문서로 편입되지 않았다.
  - 재시도 고유의 관측성과 mutation 재시도의 idempotency 게이트는 이미 [API 재시도 정책](./retry.md)에 정의되어 있으므로 여기에 별도 하위 문서 항목이 필요하지 않다.

나머지 주제를 다루는 정책 초안이 `.claude/temp/retry-resilience-policy.ko.md`에 있지만, 아직 정식 컨벤션 문서로 확정되지 않았다. 특정 주제가 확정되면, 상위 [API 컨벤션 인덱스](../../index.md)와 같은 형식으로 여기에 라우팅 항목을 추가한다. 예:

  - Retry budget 정책 결정: API Retry Budget 정책을 읽는다 (문서 생성 후 링크).
  - Bulkhead, fallback, graceful degradation, health-check 기반 failover 정책 결정: 관련 문서를 읽는다 (문서 생성 후 링크).
