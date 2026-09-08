---
title: API 트랜잭션 재시도 정책
lang: ko
audience: both
applies_to:
  - apps/api
source: ../../../en/operability/fault-tolerance/transaction-retry.md
last_synced: 2026-09-08
read_when:
  - DB 트랜잭션 재시도 루프를 어떻게 구조화할지, 어느 계층이 소유할지, optimistic-concurrency 재읽기·circuit breaker·retry budget과 어떻게 조합할지 결정할 때.
related:
  - ./index.md
  - ./retry.md
---

# API 트랜잭션 재시도 정책

- 트랜잭션 재시도는 단일 외부 호출을 재시도하는 것과 달리, 충돌이 발생한 DB 트랜잭션 전체 또는 그것이 속한 여러 단계짜리 작업 단위 전체를 처음부터 다시 실행하는 것이다.

## 적용 범위

- 이 문서는 트랜잭션 재시도 루프를 어떻게 구조화할지, 어느 계층이 소유할지, network 수준 재시도와 backoff이 어떻게 다른지, circuit breaker·retry budget과 어떻게 조합되는지 판단할 때 사용한다.
- 무엇이 재시도 대상인 DB 트랜잭션 충돌인지(DB가 신호하는 concurrency conflict, 애플리케이션이 검사하는 optimistic-concurrency 충돌, 재시도 대상이 아닌 data constraint violation)는 이 문서가 아니라 [API 재시도 정책](./retry.md)의 [DB 트랜잭션 충돌 Classification](./retry.md#db-트랜잭션-충돌-classification)에 정의되어 있다.
- 외부 의존성 호출에 대한 network 수준 재시도 소유권, 횟수, backoff은 이 문서가 아니라 [API 재시도 정책](./retry.md)에 정의되어 있다.

## 재시도 소유권

- 트랜잭션을 시작하는 계층(보통 `db.transaction(...)`을 호출하는 repository 또는 persistence 계층)이 재시도를 소유한다.
- 이건 [API 재시도 정책의 재시도 소유권](./retry.md#재시도-소유권)이 이미 명시한 "whole unit of work" 예외의 구체적인 사례다: 동시에 실행된 다른 트랜잭션과 충돌한 DB 트랜잭션은 그 안의 문장 하나가 아니라 트랜잭션 전체를 다시 실행해서 재시도한다.
- 재시도 루프는 실패한 문장 하나가 아니라 트랜잭션 콜백 전체를 다시 실행한다.
  - read-modify-write 패턴이라면 쓰기 단계가 아니라 읽기 단계부터 다시 실행한다.
    - 쓰기만 재시도하면 여전히 오래된 데이터를 기준으로 하므로 같은 충돌이 반복된다 — [DB 트랜잭션 충돌 Classification](./retry.md#db-트랜잭션-충돌-classification)의 read-modify-write 규칙을 메커니즘 수준에서 구체화한 것이다.

## Backoff

- DB concurrency conflict는 network 실패보다 훨씬 짧은 시간 안에 해소된다: 재시도가 실행될 시점이면 충돌한 트랜잭션은 이미 커밋되거나 롤백됐을 가능성이 높다.
- network 수준 재시도보다 훨씬 작은 `baseDelay`를 쓰거나, 같은 hot row에 즉시 재충돌하는 것만 피할 정도의 최소한의 jitter만 두고 growing backoff은 두지 않는다.
- [API 재시도 정책이 `baseDelay`/`maxDelay`를 고정 상수로 보지 않는 것](./retry.md#backoff와-jitter)과 마찬가지로, 이 delay도 고정 상수로 취급하지 않는다: 대상 테이블/워크로드의 실제 충돌 해소 시간을 측정해서 조정한다.

## Max Retry

- [Mutation 안전성 게이트](./retry.md#mutation-안전성-게이트)로 0-1회로 제한되는 network 수준 mutation 재시도와 달리, 트랜잭션 재시도는 짧고 비용이 낮다.
  - 트랜잭션의 안전성은 idempotency가 아니라 atomicity(실패한 시도는 부분 반영이 없음)에서 나오므로, idempotent하지 않은 network mutation보다 더 많은 횟수를 시도할 수 있다.
- 정확한 재시도 횟수를 여기서 못박지 않는다.
  - [circuit breaker의 threshold를 고정하지 않고 튜닝하는 것](./circuit-breaker.md#thresholds-are-tuned-not-fixed)과 같은 방식으로, 대상 테이블/워크로드에서 관측된 충돌 빈도로 조정한다.

## Circuit Breaker·Retry Budget과의 조합

- circuit breaker와 retry budget은 외부 의존성 호출에 적용된다([API Circuit Breaker 정책](./circuit-breaker.md), [API Retry Budget 정책](./retry-budget.md) 참고).
  - DB 트랜잭션 재시도는 그런 의미의 외부 의존성 호출이 아니므로 둘 다 적용 범위 밖이다.
- 이렇게 재시도되는 트랜잭션 안에서 (다른 의존성이나 외부 API 같은) 외부 호출을 하지 않는다.
  - 그렇게 하면 DB 락을 필요 이상으로 오래 잡게 되고, 무관한 외부 실패가 DB 충돌 재시도와 엮이게 된다. 트랜잭션은 DB 작업만으로 한정한다.

## 관측성

- 이 절은 트랜잭션 재시도 고유의 내용만 정의한다. 이벤트를 로그로 남길지·어떤 레벨로 남길지는 [API 로깅 정책](../logging.md)을 따르고, 로그·메트릭 전송 방식은 [API 옵저버빌리티 컨벤션](../observability.md)을 따른다.
- 트랜잭션 재시도에 국한되지 않는 재시도 고유 structured log 필드와 metric은 [API 재시도 정책](./retry.md)의 [관측성](./retry.md#관측성)에 정의되어 있고 여기서 중복하지 않는다.

### Structured Log 필드

- 트랜잭션 재시도 결정에 대한 로그 레코드에는 다음 필드를 포함한다:

```text
table
operation
attempt
maxRetries
delayMs
conflictType
retryAllowed
retryBlockedReason
```

- `conflictType`은 [DB 트랜잭션 충돌 Classification](./retry.md#db-트랜잭션-충돌-classification)의 어떤 케이스가 재시도를 유발했는지 기록한다(예: `serialization_failure`, `deadlock`, `optimistic_concurrency`).

### Metric

- 테이블 또는 작업 단위별로 최소 다음을 추적한다:

```text
transaction_total
transaction_conflict_total
transaction_retry_attempt_total
transaction_retry_exhausted_total
```
