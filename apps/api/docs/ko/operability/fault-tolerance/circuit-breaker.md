---
title: API Circuit Breaker 정책
lang: ko
audience: both
applies_to:
  - apps/api
source: ../../../en/operability/fault-tolerance/circuit-breaker.md
last_synced: 2026-09-07
read_when:
  - 외부 의존성 호출에 대한 circuit breaker 상태 전환, breaker 범위, circuit breaker와 재시도의 상호작용을 정의, 구현, 리뷰할 때.
related:
  - ./index.md
  - ./retry.md
---

# API Circuit Breaker 정책

- circuit breaker는 이미 광범위하게 실패하고 있는 의존성 호출을, 모든 caller가 각자 알아채게 두는 대신 아예 멈춘다.

## 적용 범위

- 이 문서는 circuit breaker 상태 전환, breaker를 어느 범위에 둘지, circuit breaker가 재시도와 어떻게 상호작용하는지 판단할 때 사용한다.
- 재시도 소유권, 재시도 횟수, backoff, error classification은 이 문서가 아니라 [API 재시도 정책](./retry.md)에 정의되어 있다.
- retry budget, idempotency, 관측성은 별개의 fault-tolerance 관심사이며 아직 정식 컨벤션 문서로 승격되지 않았다.
  - 현재 승격 상태는 [API Fault Tolerance 인덱스](./index.md)에서 확인한다.

## Circuit Breaker가 필요한 이유

- 의존성이 요청 하나가 아니라 광범위하게 실패하고 있을 때, [API 재시도 정책](./retry.md)에 따라 실패한 호출을 각자 재시도해도 여전히 그 의존성이 감당할 수 없는 부하가 계속 들어가서, 복구를 늦추고 어차피 실패할 호출에 caller의 시간을 낭비하게 된다.
- circuit breaker는 한 의존성에 대한 호출들의 실패를 추적하다가, 실패가 임계값을 넘으면 새 호출 자체를 멈춘다. 모든 caller가 각자 장애를 알아채게 두지 않는다.

## Breaker 범위

- circuit breaker는 외부 의존성 하나(API 하나, LLM provider 하나, downstream 서비스 하나) 단위로 둔다. 애플리케이션 전체 단위도, 개별 요청 단위도 아니다.
  - 범위가 너무 넓으면 보호하려는 의존성과 무관한 실패에도 breaker가 트립된다. 범위가 너무 좁으면 실제 장애를 판단할 만큼 충분한 실패를 관측하지 못한다.

## 상태 머신

- circuit breaker는 세 가지 상태를 갖는다:

```text
closed -> open -> half-open -> closed
```

- `closed`: 의존성을 정상적으로 호출하면서 실패율을 감시한다.
- `open`: 실제로 호출하지 않고 즉시 실패시킨다.
- `half-open`: 소수의 시험 호출만 통과시켜 의존성이 복구됐는지 확인한다.
  - 성공하면 `closed`로 돌아가고, 계속 실패하면 다시 `open`으로 돌아간다.

## 재시도와의 조합

- circuit breaker는 재시도 정책보다 바깥쪽에 둔다:

```text
circuit breaker -> retry policy -> actual call
```

- breaker가 `open`이면 그 호출에 대해 [API 재시도 정책](./retry.md)은 아예 실행되지 않는다. 재시도 로직에 도달하기 전에 즉시 실패하기 때문이다.
- `half-open`에서 허용되는 제한된 시험 호출을 재시도가 소비하게 두지 않는다. `half-open`의 시험 호출은 복구 여부를 확인하기 위한 것이며, 여기에 재시도를 적용하면 그 목적이 깨지고 의존성의 실제 상태가 아니라 재시도로 생긴 노이즈 때문에 다시 `open`으로 트립될 수 있다.

## 임계값은 고정하지 않고 조정한다

- 실패율 임계값, 평가 window, 최소 요청 수, open 지속 시간을 고정 상수로 취급하지 않는다. 이 값들은 대상 의존성의 기본 트래픽 규모와 평상시 실패율에 크게 좌우되고 의존성마다 다르므로, 값을 미리 고정하지 말고 관측 데이터를 측정해서 조정한다.
- 의존성의 동작이 바뀌면(예: 트래픽 규모가 달라지거나 평상시 실패율이 달라지면) 한 번 정한 값을 고수하지 말고 다시 값을 조정한다.
