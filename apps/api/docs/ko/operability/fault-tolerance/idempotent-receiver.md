---
title: API Idempotent Receiver 정책
lang: ko
audience: both
applies_to:
  - apps/api
source: ../../../en/operability/fault-tolerance/idempotent-receiver.md
last_synced: 2026-09-07
read_when:
  - 어떤 operation이 자연적으로 멱등한지 판단하거나, idempotency key를 설계하거나, 안전하게 재시도 가능해야 하는 mutation의 서버 측 중복 제거를 구현할 때.
related:
  - ./index.md
  - ./retry.md
---

# API Idempotent Receiver 정책

- idempotent receiver는 같은 논리적 요청이 여러 번 전달돼도 한 번 전달된 것과 같은 효과만 나게 만들어서, mutation을 안전하게 재시도할 수 있게 한다.

## 적용 범위

- 이 문서는 어떤 operation이 자연적으로 멱등한지, idempotency key를 어떻게 생성·범위 지정하는지, 서버가 그 key로 어떻게 중복을 제거하는지, 중복 요청에 무엇을 반환하는지 판단할 때 사용한다.
- mutation이 멱등할 때만 재시도 가능하다는 규칙은 이 문서가 아니라 [API 재시도 정책의 Mutation 안전성 게이트](./retry.md#mutation-안전성-게이트)에 정의되어 있다. 이 문서는 그 멱등성 보장 자체를 어떻게 제공하는지를 정의한다.
- retry budget, circuit breaker, 관측성은 이 정책과 상호작용하지만 각자의 문서에 정의되어 있다. [API Fault Tolerance 인덱스](./index.md) 참고.

## 자연적 멱등성

- 어떤 operation은 별도 메커니즘 없이도 멱등하다. 반복해도 첫 성공 적용 이후로는 아무것도 바뀌지 않기 때문이다.
  - 예: 같은 representation으로 리소스를 완전히 대체하는 `PUT`.
  - 예: 리소스에 대한 `DELETE`. endpoint가 이미 삭제된 리소스에 대한 삭제를 오류가 아니라 성공으로 처리한다면.
- operation이 허용한다면 idempotency key보다 자연적 멱등성을 우선한다: 추가적인 client/server 상태가 필요 없기 때문이다.
- 반복했을 때 첫 적용 이후로도 결과가 계속 바뀐다면(예: "잔액 차감", "주문 생성", 대체가 아니라 추가하는 `POST`) 그 operation은 자연적으로 멱등하지 않다.

## Idempotent Receiver

- 자연적으로 멱등하지 않은 operation은 서버를 idempotent receiver로 만든다: 재시도된 요청을 중복으로 인식해서, 효과를 다시 적용하는 대신 원래 결과를 반환한다.
- caller는 하나의 논리적 operation 시도를 식별하는 idempotency key를 붙인다. 이는 재시도 메커니즘과는 별개다: 재시도된 호출은 같은 key를 재사용하고, 새로운 operation은 새 key를 받는다.
  - key는 operation과 caller 단위로 범위를 지정한다(예: user별, resource별). 그래야 관련 없는 caller끼리 같은 key로 충돌하지 않는다.
- 서버는 효과를 적용하기 전에 key를 확인한다:
  - key를 처음 본다면 효과를 적용하고 그 key를 결과와 함께 기록한다.
  - key를 이미 봤고 이전 시도가 완료됐다면, 효과를 다시 적용하지 않고 기록된 결과를 반환한다.
  - key를 이미 봤는데 이전 시도가 아직 진행 중이라면, 동시에 효과를 적용하지 않는다. 정확한 동시성 처리 방식(진행 중인 시도를 기다리거나, 거부하거나)은 구현 선택이지만, 효과를 두 번 적용하는 것은 허용되는 결과가 아니다.
- 기록한 key를 영구히, 또는 고정된 기간만큼 보관하지 않는다.
  - 그 key가 재사용될 수 있는 재시도 윈도우 동안만 보관한다.
  - 이 윈도우는 모든 operation에 고정된 값이 아니라 caller의 deadline과 backoff 설정([API 재시도 정책](./retry.md), [API Timeout & Deadline 정책](./timeout-deadline.md) 참고)에 따라 달라진다.

## 재시도와의 조합

- [API 재시도 정책의 Mutation 안전성 게이트](./retry.md#mutation-안전성-게이트)가 이 문서를 소비하는 규칙이다: mutation은 자연적으로 멱등하거나 여기서 정의한 idempotent receiver로 뒷받침될 때만 재시도 가능하다.
- 이 문서는 재시도 횟수, backoff, 어떤 오류가 재시도 대상인지는 정의하지 않는다. 이는 [API 재시도 정책](./retry.md)을 참고한다.
