---
title: API Timeout & Deadline 정책
lang: ko
audience: both
applies_to:
  - apps/api
source: ../../../en/operability/fault-tolerance/timeout-deadline.md
last_synced: 2026-09-07
read_when:
  - 외부 의존성(외부 API, LLM, 네트워크 호출, 큐)에 닿는 call chain의 per-attempt timeout, 전체 deadline, 계층 간 deadline propagation을 정의, 구현, 리뷰할 때.
related:
  - ./index.md
  - ./retry.md
---

# API Timeout & Deadline 정책

Timeout과 deadline은 둘 다 "얼마나 오래 걸려도 되는가"를 제한하지만, 제한하는 대상이 다르다.

## 적용 범위

- 이 문서는 per-attempt timeout, 전체 deadline, 계층/프로세스 경계를 넘는 deadline propagation 방식을 판단할 때 사용한다.
  - per-attempt timeout이나 전체 deadline을 호출 종류별 고정 상수로 취급하지 않는다. 이 값들은 대상 의존성의 실제 latency·실패 양상에 크게 좌우되고 의존성마다 다르므로, 값을 미리 고정하지 말고 관측 데이터를 측정해서 조정한다.
  - 의존성의 동작이 바뀌면(예: downstream이 느려지거나, 새로운 rate limit이 생기거나, 트래픽 패턴이 달라지면) 한 번 정한 값을 고수하지 말고 다시 값을 조정한다.
- 재시도 소유권, 재시도 횟수, backoff, error classification은 이 문서가 아니라 [API 재시도 정책](./retry.md)에 정의되어 있다.
- retry budget, circuit breaker, idempotency, 관측성은 별개의 fault-tolerance 관심사이며 아직 정식 컨벤션 문서로 승격되지 않았다.
  - 현재 승격 상태는 [API Fault Tolerance 인덱스](./index.md)에서 확인한다.

## Timeout과 Deadline은 서로 다른 축이다

- Timeout은 한 번의 시도, 한 계층이 완료하는 데 허용되는 상대적인 기간이다 (예: "이 호출은 5초 기다린다").
- Deadline은 전체 call chain — 모든 계층과 재시도를 포함한 모든 시도 — 이 끝나야 하는 절대적인 시점이다 (예: "12:00:05.000까지는 끝나야 한다").
- 계층별 timeout을 deadline의 대체물로 취급하지 않는다.
  - 각 계층이 독립적으로 자신만의 상대적 timeout clock을 시작하면, 그 계층은 상위 계층이 이미 얼마나 시간을 썼는지 알 수 없다.
  - 예: 상위 계층이 자신의 5초 예산 중 3초를 이미 쓴 상태에서 하위 계층을 호출했다고 하자. 하위 계층이 0부터 시작하는 독립적인 5초 timeout을 새로 시작하면, 상위 계층의 전체 예산은 2초밖에 남지 않았는데도 하위 계층은 최대 5초를 더 실행할 수 있다. 두 clock이 실제로 남은 시간에 대해 서로 다른 답을 갖게 된다.
- Deadline은 각 계층이 자신만의 상대적 clock을 새로 시작하는 대신, 모든 계층이 하나의 절대 시각 값을 공유하게 만들어서 이 문제를 피한다.

## Deadline Propagation

- 요청을 처음 받는 계층(그 call chain의 top-level entry point)이 `deadlineAt = now + deadlineMs`로 deadline을 한 번만 계산한다.
- 하나의 프로세스 안에서는, 하위 계층이 자기 나름의 deadline을 처음부터 다시 계산하게 두지 말고 그 call chain 안의 모든 in-process 계층과 호출에 `deadlineAt`을 그대로 전달한다.
- 각 계층의 단일 시도 timeout은 다음 두 값 모두로 제한된다:
  - 자신의 per-attempt timeout, 그리고
  - `deadlineAt`까지 남은 시간.
- `deadlineAt`까지 남은 시간이 최소한의 시도를 완료하기에도 부족하면 새 시도, 재시도, 대기를 시작하지 않는다.

### 프로세스/네트워크 경계를 넘을 때

- 호출이 프로세스나 네트워크 경계를 넘을 때는 절대 시각 `deadlineAt`이 아니라, 그 호출 직전에 계산한 남은 시간(`remainingMs = deadlineAt - now`)을 전파한다.
  - `deadlineAt`은 보내는 프로세스 자신의 clock 기준 절대 시각이다. 이 값을 그대로 다른 프로세스에 보내는 것은 두 프로세스의 clock이 같은 시각을 가리킨다고 가정하는 셈이다.
  - 호스트 간 clock skew(clock drift, NTP 미동기화나 오설정, container/VM clock 문제)는 이 가정을 깨뜨린다. 같은 절대 `deadlineAt` 값이라도 clock이 어긋난 수신 측에서는 이미 지난 시각으로 보이거나, 반대로 한참 남은 시각으로 보일 수 있다.
- 수신 측 서비스는 전달받은 `remainingMs`로 자신의 local `deadlineAt = 자신의 now + remainingMs`를 계산하고, 이 값을 자신의 모든 계층과 이후에 넘는 다른 경계에도 사용한다.
- call chain이 프로세스 경계를 넘을 때마다 이 "남은 시간 전달"을 반복한다. 하나의 절대 `deadlineAt` 값을 프로세스 경계 두 개 이상에 걸쳐 그대로 들고 다니지 않는다.
- 이 정책은 deadline의 정확성을 위해 clock 동기화(예: NTP)에 의존하지 않는다. deadline이 프로세스 경계를 넘을 때 절대 시각이 아니라 상대 시간으로 전달되기 때문이다. 다만 서비스 간 로그·trace 상관관계를 위해서는 clock 동기화를 운영상 관행으로 유지한다.

## 재시도와의 상호작용

- [API 재시도 정책](./retry.md)은 `deadlineAt`까지 남은 시간을 넘기는 backoff delay를 계산하거나 새 시도를 시작해서는 안 된다.
- 재시도 시도 역시 이 문서의 deadline이 제한하는 "시도" 중 하나다. 재시도 횟수와 backoff delay는 이 문서가 아니라 [API 재시도 정책](./retry.md)에서 정의한다.
