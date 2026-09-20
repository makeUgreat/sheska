---
title: API Fault Tolerance 인덱스
applies_to:
  - apps/api
related:
  - ./retry.md
  - ./timeout-deadline.md
  - ./async-workflow-retry.md
  - ./idempotent-receiver.md
  - ./retry-budget.md
  - ./transaction-retry.md
---

# API Fault Tolerance 인덱스

## 목적

이 인덱스는 외부 의존성(외부 API, LLM, 네트워크 호출, 큐) 호출 실패를 다루는 `apps/api` 컨벤션들을 묶는다: retry, timeout/deadline, 비동기/workflow/saga 재시도, idempotent receiver, retry budget, DB 트랜잭션 재시도.

## 라우팅

- 외부 의존성 호출에 대한 재시도 소유권, 재시도 횟수, backoff, error classification 결정: [API 재시도 정책](./retry.md)을 읽는다.
- per-attempt timeout, 전체 deadline, 계층 간 deadline propagation 결정: [API Timeout & Deadline 정책](./timeout-deadline.md)을 읽는다.
- 메시지 큐 consumer 재시도, dead letter queue/redrive policy, workflow/activity/saga 재시도 결정: [API 비동기 & Workflow 재시도 정책](./async-workflow-retry.md)을 읽는다.
- 자연적 멱등성 판단 기준, idempotency key 생성/저장, 재시도되는 mutation의 서버 측 중복 제거 결정: [API Idempotent Receiver 정책](./idempotent-receiver.md)을 읽는다.
- retry budget 비율, budget window, retry budget이 개별 호출 재시도와 어떻게 조합되는지 결정: [API Retry Budget 정책](./retry-budget.md)을 읽는다.
- DB 트랜잭션 재시도 루프 구조, 소유권, retry budget과의 조합 방식 결정: [API 트랜잭션 재시도 정책](./transaction-retry.md)을 읽는다.

circuit breaker, bulkhead, fallback, graceful degradation, health-check 기반 failover도 이 묶음에 속하지만 아직 컨벤션 문서가 없다. 그중 하나가 확정되면 위 라우팅 목록에 같은 형식으로 항목을 추가한다.
