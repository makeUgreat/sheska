---
title: API Fault Tolerance 인덱스
applies_to:
  - apps/api
related:
  - ./retry.md
  - ./timeout-deadline.md
  - ./async-workflow-retry.md
  - ./transaction-retry.md
---

# API Fault Tolerance 인덱스

## 목적

이 인덱스는 외부 의존성(외부 API, LLM, 네트워크 호출, 큐) 호출이 실패했을 때의 `apps/api` 컨벤션을 묶는다.

## 라우팅

- 외부 의존성 호출에 대한 재시도 소유권, 재시도 횟수, backoff, error classification 결정: [API 재시도 정책](./retry.md)을 읽는다.
- per-attempt timeout, 전체 deadline, 계층 간 deadline propagation 결정: [API Timeout & Deadline 정책](./timeout-deadline.md)을 읽는다.
- 메시지 큐 consumer 재시도, dead letter queue/redrive policy, workflow/activity/saga 재시도 결정: [API 비동기 & Workflow 재시도 정책](./async-workflow-retry.md)을 읽는다.
- DB 트랜잭션 재시도 루프 구조와 소유권 결정: [API 트랜잭션 재시도 정책](./transaction-retry.md)을 읽는다.
