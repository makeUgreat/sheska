---
title: API Fault Tolerance 인덱스
lang: ko
audience: both
applies_to:
  - apps/api
source: ../../../en/operability/fault-tolerance/index.md
last_synced: 2026-09-07
related: []
---

# API Fault Tolerance 인덱스

## 목적

이 인덱스는 외부 의존성(외부 API, LLM, 네트워크 호출, 큐) 호출 실패를 다루는 `apps/api` 컨벤션들을 묶는다: retry, timeout/deadline, retry budget, circuit breaker, 그리고 앞으로 정식 컨벤션 문서로 확정될 bulkhead, fallback, graceful degradation, health-check 기반 failover 등의 메커니즘.

## 동기화 정책

영어와 한글 `apps/api` fault-tolerance 문서는 같은 정책을 설명하는 쌍 문서다.
두 문서가 충돌하면 영어와 한글 중 의도한 정책을 선택하고 같은 변경 단위에서 양쪽 문서를 모두 수정한다.

## 라우팅

아직 이 인덱스에 편입된 fault-tolerance 하위 문서는 없다.

`.claude/temp/retry-resilience-policy.ko.md`에 retry/backoff/timeout/circuit breaker 정책 초안이 있지만, 아직 정식 컨벤션 문서로 확정되지 않았다. 이 초안(또는 다른 fault-tolerance 주제)이 확정되면, 상위 [API 컨벤션 인덱스](../../index.md)와 같은 형식으로 여기에 라우팅 항목을 추가한다. 예:

- Retry, backoff, timeout/deadline, retry budget, circuit breaker 정책 결정: API Retry & Resilience 정책을 읽는다 (문서 생성 후 링크).
- Bulkhead, fallback, graceful degradation, health-check 기반 failover 정책 결정: 관련 문서를 읽는다 (문서 생성 후 링크).