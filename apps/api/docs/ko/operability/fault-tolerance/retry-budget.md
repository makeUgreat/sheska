---
title: API Retry Budget 정책
lang: ko
audience: both
applies_to:
  - apps/api
source: ../../../en/operability/fault-tolerance/retry-budget.md
last_synced: 2026-09-07
read_when:
  - 모든 caller를 합쳐서 한 의존성이 받는 재시도 트래픽 총량 제한을 정의, 구현, 리뷰할 때, 또는 retry budget이 개별 호출 재시도·circuit breaker와 어떻게 조합되는지 판단할 때.
related:
  - ./index.md
  - ./retry.md
  - ./circuit-breaker.md
---

# API Retry Budget 정책

- retry budget은 개별 호출의 재시도 횟수와 별개로, 모든 caller를 합쳐서 재시도가 한 의존성에 추가할 수 있는 트래픽 총량을 제한한다.

## 적용 범위

- 이 문서는 retry budget 비율, 측정 window, retry budget이 개별 호출 재시도·circuit breaker와 어떻게 조합되는지 판단할 때 사용한다.
- 재시도 소유권, 개별 호출의 재시도 횟수, backoff, error classification은 이 문서가 아니라 [API 재시도 정책](./retry.md)에 정의되어 있다.
- circuit breaker 상태 전환과 breaker 범위는 이 문서가 아니라 [API Circuit Breaker 정책](./circuit-breaker.md)에 정의되어 있다.
- fault-tolerance 주제 전반에 공유되는 idempotency·관측성 컨벤션은 [API 재시도 정책](./retry.md)에 정의되어 있으며 여기서는 참조만 하고 중복하지 않는다.

## Retry Budget이 필요한 이유

- [API 재시도 정책](./retry.md)은 호출 하나가 몇 번 재시도되는지를 제한하지만, 시스템 전체가 한 의존성에 보내는 재시도 트래픽 총량은 제한하지 않는다.
  - 의존성이 저하되면 서로 무관한 여러 caller가 동시에 재시도한다. 각 caller의 재시도 횟수는 개별적으로 보면 합리적이어도, 합쳐진 재시도 트래픽이 저하된 의존성이 감당할 수 있는 양을 넘어서면 복구가 늦어진다.
- circuit breaker는 관련은 있지만 다른 문제를 다룬다: 이미 광범위하게 실패하고 있는 의존성에 대한 호출 자체를 멈춘다([API Circuit Breaker 정책](./circuit-breaker.md)).
  - retry budget은 트래픽 총량 문제를 직접 다룬다: 의존성의 실패율이 breaker를 트립시킬 만큼 높아지기 전에도, 재시도만으로 이미 불균형한 부하가 추가될 수 있다. budget은 이 부하를 실패율 임계값이 아니라 원본 트래픽 대비 비율로 제한한다.

## Budget 정책

- 재시도 트래픽을 원본(재시도가 아닌) 요청 트래픽의 고정 비율로 제한하고, sliding window로 측정하며, 의존성 단위로 범위를 둔다:

```ts
retryBudgetRatio: 0.1 // retry attempts <= original attempts의 10%
retryBudgetWindowMs: 60_000
```

- 한 호출의 첫 번째 시도만 원본 트래픽으로 집계한다. 그 이후의 모든 재시도 시도는 원본 트래픽이 아니라 retry budget으로 집계한다.
- budget은 [circuit breaker 범위](./circuit-breaker.md#breaker-범위)와 같은 단위인 의존성별로 추적한다. 애플리케이션 전체 단위로 범위를 두면, 저하된 의존성 하나의 재시도가 정상 의존성들을 위한 budget까지 소비하게 된다.

## Budget이 소진됐을 때

- 재시도하려는 호출이 있는데 현재 window의 retry budget이 소진됐다면, `open` 상태의 circuit breaker와 마찬가지로 재시도하지 않고 그 호출을 즉시 실패시킨다.
- budget이 다시 채워지길 기다리며 호출을 큐에 넣거나 지연시키지 않는다. 막힌 재시도도 여전히 caller의 자원을 점유하므로 부하를 제한하려는 목적이 깨진다.
- [관측성](#관측성)에 따라 소진 사실을 기록해서, caller와 운영자가 "retry budget 소진"과 "재시도했지만 실패"를 구분할 수 있게 한다.

## 재시도·Circuit Breaker와의 조합

- retry budget과 circuit breaker는 개별 호출 재시도보다 먼저 평가한다. 이 둘 사이의 순서는 상관없지만, 둘 다 재시도 loop 바깥쪽에 둔다:

```textㅅ
circuit breaker -> retry budget -> retry policy -> actual call
```

- breaker가 `open`이면 retry budget을 확인하기도 전에 호출이 실패한다. [API Circuit Breaker 정책](./circuit-breaker.md)의 [재시도와의 조합](./circuit-breaker.md#재시도와의-조합)을 참고한다.
- breaker가 `closed` 또는 `half-open`이지만 retry budget이 소진됐다면, [API 재시도 정책](./retry.md)의 개별 호출 재시도 loop가 실행되기 전에 호출이 실패한다.
- [API 재시도 정책](./retry.md)의 `maxRetries` 안에서 재시도되는 호출도, 첫 시도 이후의 각 시도마다 retry budget을 소비한다. 호출 하나가 `maxRetries`에 도달하는 것과 의존성의 retry budget이 소진되는 것은 서로 독립적인 중단 조건이며, 둘 중 하나만 발생해도 그 호출의 추가 재시도는 멈춘다.

## 비율과 Window는 고정하지 않고 조정한다

- `retryBudgetRatio`와 `retryBudgetWindowMs`를 고정 상수로 취급하지 않는다. circuit breaker의 [임계값은 고정하지 않고 조정한다](./circuit-breaker.md#임계값은-고정하지-않고-조정한다)와 같은 이유로, 이 값들은 대상 의존성의 기본 트래픽 규모와 평상시 실패율에 좌우되고 의존성마다 다르다.
  - 값을 미리 고정하지 말고 관측 데이터를 측정해서 조정한다.
  - 의존성의 동작이 바뀌면(예: 트래픽 규모가 달라지거나 평상시 실패율이 달라지면) 값을 다시 조정한다.

## 관측성

- 이 절은 retry budget 고유의 내용만 정의한다. 이벤트를 로그로 남길지·어떤 레벨로 남길지는 [API 로깅 정책](../logging.md)을 따르고, 로그·메트릭을 어떻게 전송할지는 [API 옵저버빌리티 컨벤션](../observability.md)을 따른다.
- budget에 특정되지 않은 재시도 관련 structured log 필드와 metric은 [API 재시도 정책](./retry.md)의 [관측성](./retry.md#관측성)에 정의되어 있으며 여기서 중복하지 않는다.

### Structured Log 필드

- retry budget 결정에 대한 로그 레코드에는 다음 필드를 포함한다:

```text
dependency
operation
retryBudgetRatio
retryBudgetWindowMs
retryBudgetRemaining
retryBudgetExhausted
```

### Metric

- 의존성별로 최소 다음을 추적한다:

```text
retry_budget_consumed_total
retry_budget_exhausted_total
```