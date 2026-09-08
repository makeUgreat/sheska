---
title: API 재시도 정책
lang: ko
audience: both
applies_to:
  - apps/api
source: ../../../en/operability/fault-tolerance/retry.md
last_synced: 2026-09-08
read_when:
  - 외부 의존성(외부 API, LLM, 네트워크 호출, 큐) 호출에 대한 재시도 소유권, 재시도 횟수, backoff, 어떤 오류가 재시도 대상인지를 정의, 구현, 리뷰할 때.
related:
  - ./index.md
  - ./timeout-deadline.md
  - ./async-workflow-retry.md
  - ./circuit-breaker.md
  - ./idempotent-receiver.md
  - ./retry-budget.md
  - ./transaction-retry.md
  - ../error.md
  - ../logging.md
  - ../observability.md
---

# API 재시도 정책

- 재시도는 외부 의존성 호출이 실패했을 때 다시 시도할지, 어떻게 다시 시도할지를 결정한다.

## 적용 범위

- 이 문서는 누가, 몇 번, 얼마나 기다렸다가, 어떤 오류에 대해 재시도할지 판단할 때 사용한다.
- timeout/deadline은 이 문서가 아니라 [API Timeout & Deadline 정책](./timeout-deadline.md)에 정의되어 있다.
- circuit breaker 조합은 이 문서가 아니라 [API Circuit Breaker 정책](./circuit-breaker.md)에 정의되어 있다.
- retry budget 비율, budget window, retry budget이 개별 호출 재시도·circuit breaker와 어떻게 조합되는지는 이 문서가 아니라 [API Retry Budget 정책](./retry-budget.md)에 정의되어 있다.
- idempotency의 mutation 재시도 게이트는 [재시도 대상 오류](#재시도-대상-오류)에 정의되어 있다. 더 넓은 idempotent receiver 정책(자연적 멱등성 판단 기준, idempotency key 생성·저장·중복 제거)은 이 문서가 아니라 [API Idempotent Receiver 정책](./idempotent-receiver.md)에 정의되어 있다.
- 재시도 결정이 남겨야 하는 structured log 필드와 metric은 [관측성](#관측성)에 정의되어 있다.
  - 이벤트를 로그로 남길지, 어떤 레벨로 남길지는 [API 로깅 정책](../logging.md)을 따르고, 로그·메트릭을 어떻게 전송할지는 [API 옵저버빌리티 컨벤션](../observability.md)을 따른다. 이 문서는 재시도 고유의 내용만 정의한다.

## 재시도 소유권

- 재시도는 상위 계층이 아니라 외부 의존성을 직접 호출하는 client 또는 adapter 계층이 소유한다.
  - 하나의 요청 경로에는 재시도 소유자가 정확히 하나여야 한다. 여러 계층이 같은 실패에 대해 각자 재시도하면 retry amplification이 발생한다.
- 상위 계층(application 계층의 use case, 또는 HTTP controller나 queue consumer 같은 presentation 계층 진입점)은 직접 retry loop를 만들지 않고 client/adapter 계층의 재시도 정책에 위임한다.
  - 예외: 재시도 단위가 단일 외부 호출이 아니라 통째로 다시 실행해야 의미가 있는 workflow 전체일 때는 상위 계층이 재시도할 수 있다.
    - 예: saga나 orchestration의 한 단계를 atomic하게 다시 실행해야 한다면, 그 안의 호출 하나만 재시도하지 않고 saga/orchestrator 단위로 재시도한다.
    - 예: BullMQ job 단위 재시도(`.claude/temp/embed-queue-retry-policy.ko.md` 큐 재시도 정책 초안 참고)는 job 안에서 실패한 외부 호출 하나가 아니라 job 전체를 다시 실행한다.
    - 예: 동시에 실행된 다른 트랜잭션과 충돌한 DB 트랜잭션은 그 안의 문장 하나가 아니라 트랜잭션 전체를 다시 실행해서 재시도한다.
      - 그 재시도 루프를 어떻게 구조화하고 소유하는지는 [API 트랜잭션 재시도 정책](./transaction-retry.md)을 참고한다.
    - consumer retry, dead letter queue/redrive policy, workflow/activity retry, saga retry는 [API 비동기 & Workflow 재시도 정책](./async-workflow-retry.md)에서 자세히 다룬다.
  - 이 예외가 적용되는 경우, workflow 단위 재시도 시도 안에서 이루어지는 외부 호출에 대해서는 client/adapter 계층 자체의 재시도를 끈다(`maxRetries: 0`).
  - workflow 단위 재시도와 client/adapter 단위 재시도를 같은 호출에 동시에 적용하지 않는다.
    - 두 횟수가 곱해져서(예: workflow 3회 x adapter 3회 = 최대 9회 호출) 어느 한쪽 계층이 의도한 것보다 훨씬 많은 실질 재시도 횟수가 나온다.

## Max Retry

- 외부 의존성 호출의 기본값은 `maxRetries: 2` (총 3회 시도)다.
- 실패한 시도의 비용이 크거나, 멱등하지 않거나, caller가 시간에 민감하다면 재시도 횟수를 줄인다. 시도 비용이 낮고, 안전하게 반복 가능하고, caller가 추가 시간을 감당할 수 있다면 재시도 횟수를 늘린다.

| 호출 범주 | Max retry |
|---|---:|
| 내부/로컬 연산 | 0 |
| 읽기 전용 외부 호출 (GET, metadata fetch, polling, LLM read) | 2, polling이 deadline으로 제한된다면 3-5 |
| Mutation (`POST`/`PUT`/`PATCH`/`DELETE`) | 0, idempotency key가 있으면 1 |
| background job (queue consumer 또는 scheduled job) | 3, retry budget을 엄격히 적용 |

## Backoff와 Jitter

- 이미 어려움을 겪고 있는 의존성에 부하를 더하지 않도록 재시도 간격을 벌린다: 시도마다 delay를 키우는 것(exponential backoff)은 느리거나 실패 중인 의존성을 계속 두드리지 않게 하고, 그 delay를 무작위화하는 것(jitter)은 여러 caller가 같은 순간에 몰려서 재시도하는 것(retry storm)을 막는다.
- exponential backoff와 full jitter를 사용한다:

```ts
delay = random(0, min(maxDelay, baseDelay * 2 ** attempt))
```

- `baseDelay`와 `maxDelay`를 고정 상수로 취급하지 않는다. 이 값들은 대상 의존성의 실제 latency·실패 복구 양상에 크게 좌우되고 의존성마다 다르므로, 값을 미리 고정하지 말고 관측 데이터를 측정해서 조정한다.
  - 의존성의 동작이 바뀌면(예: downstream이 느려지거나, 새로운 rate limit이 생기거나, 트래픽 패턴이 달라지면) 한 번 정한 값을 고수하지 말고 다시 값을 조정한다.
- response에 `Retry-After` 헤더가 있으면 계산된 delay보다 그 값을 우선한다.
- `Retry-After` 값 또는 계산된 delay가 call chain의 deadline까지 남은 시간을 넘기면 재시도하지 않는다.
  - deadline이 무엇이고 계층 간에 어떻게 전파되는지는 [API Timeout & Deadline 정책](./timeout-deadline.md)을 참고한다.

## 재시도 대상 오류

### Mutation 안전성 게이트

- 이 게이트는 아래 모든 classification보다 우선한다: mutation(`POST`/`PUT`/`PATCH`/`DELETE`, 또는 side effect가 있는 모든 호출)은 어떤 오류로 실패했든 멱등할 때만 재시도한다.
  - 아래 섹션에서 재시도 가능으로 분류된 오류라도, 멱등하지 않은 mutation에는 재시도해서는 안 된다.
- mutation은 자연스럽게 멱등하거나, 서버가 반영 전에 확인하는 idempotent receiver 메커니즘으로 멱등하게 만들어진 경우다.
  - 무엇이 자연적으로 멱등한지, idempotent receiver가 어떻게 동작하는지는 [API Idempotent Receiver 정책](./idempotent-receiver.md)을 참고한다.
- 재시도해야 하는 mutation이 자연스럽게 멱등하지 않다면, 안전하지 않게 재시도하는 대신 그 mutation을 멱등하게 만든다([API Idempotent Receiver 정책](./idempotent-receiver.md) 참고).
- 이 게이트가 호출 범주별 재시도 횟수로 어떻게 반영되는지는 [Max Retry](#max-retry)를 참고한다.

### 네트워크 수준 Classification

- 재시도 판단의 대부분은 timeout, 5xx 응답, 연결 끊김 같은 네트워크 관점의 실패를 다룬다.
- 일시적인 실패라 재시도했을 때 문제를 키우지 않으면서 성공할 가능성이 있다면 재시도 가능으로 취급한다: 요청이 서버에 아예 도달하지 못했거나, 서버가 일시적인 상태 때문에 처리를 완료하지 못했거나, 서버가 재시도를 기대한다고 명시적으로 신호하는 경우다.
  - 대표 예시:

```text
TimeoutError
NetworkError
429
5xx (502, 503, 504)
```

- 재시도해도 결과가 달라지지 않는다면 재시도 불가로 취급한다: 요청 자체가 잘못됐거나, caller에게 권한/인증이 없거나, 대상이 존재하지 않는 경우다. 이런 실패를 재시도하면 시도만 낭비하고 진짜 문제를 가릴 수 있다.
  - 대표 예시:

```text
408/429를 제외한 4xx
validation error
authentication/permission error
user cancellation
```

### DB 트랜잭션 충돌 Classification

- DB 트랜잭션 충돌은 위 네트워크 수준 실패와는 다른 종류의 실패다: 서버는 정상적으로 응답했지만, 동시에 실행된 다른 트랜잭션과 충돌해서 트랜잭션 자체가 실패한 경우다. 클라이언트 오류나 서버 다운이 아니다.
  - 위 네트워크 기준 classification(4xx/5xx 기준)은 여기 적용되지 않는다.
- 트랜잭션 일부가 아니라, 그 트랜잭션 전체 또는 그것이 속한 여러 단계짜리 작업 단위 전체를 처음부터 다시 실행한다.
  - 이게 안전한 이유는 실패한 트랜잭션이 부분 반영 없이 전부 롤백되기 때문이다. 이건 멱등성과는 다른 안전성 보장이다: 멱등성은 "여러 번 실행해도 결과가 같다"는 성질이고, 트랜잭션 원자성은 "실패하면 아예 반영 안 된다"는 성질이다.
  - 재시도 루프 자체를 어떻게 구조화하고 소유하는지는 [API 트랜잭션 재시도 정책](./transaction-retry.md)을 참고한다.
- DB가 알려주는 동시성 충돌(예: `SERIALIZABLE` 격리 수준에서의 serialization failure, deadlock)은 재시도 가능으로 취급한다.
  - DB가 driver exception이나 vendor별 에러 코드로 이를 명시적으로 신호하므로, 일반적인 에러 메시지로 추측하지 말고 그 신호를 인식해서 판단한다.
- 애플리케이션이 직접 검사하는 optimistic concurrency 충돌도 최신 데이터를 다시 읽은 뒤 재시도 가능으로 취급한다.
  - 이건 쓰기 시점에 버전이나 타임스탬프를 확인하는 방식으로, DB가 에러를 던지는 게 아니라 보통 쓰기가 0건 반영되는 것으로 애플리케이션이 직접 감지한다.
  - 읽고 → 수정하고 → 다시 쓰는 패턴(read-modify-write)이라면 쓰기만이 아니라 읽는 단계부터 재시도한다. 쓰기만 재시도하면 여전히 오래된 데이터를 기준으로 하므로 같은 충돌이 반복된다.
- 데이터 제약 위반(unique나 foreign key violation)은 재시도 대상이 아니다.
  - 동시성 충돌과 같은 "DB 에러" 범주처럼 보이지만, 동시 실행이 아니라 데이터 자체의 문제이므로 재시도해도 해결되지 않는다.

## 관측성

- 재시도 결정은 structured log와 metric 없이는 운영 중 디버깅하기 어렵다. 이 문서의 규칙이 재시도 여부·시점·방법을 결정하는 지점에서 이를 남긴다.
- 이 절은 재시도 고유의 내용만 정의한다. 이벤트를 로그로 남길지·어떤 레벨로 남길지는 [API 로깅 정책](../logging.md)을 따르고, 로그·메트릭 전송 방식은 [API 옵저버빌리티 컨벤션](../observability.md)을 따른다.

### Structured Log 필드

- 재시도 결정에 대한 로그 레코드에는 다음 필드를 포함한다:

```text
dependency
operation
attempt
maxRetries
delayMs
errorType
statusCode
deadlineRemainingMs
retryAllowed
retryBlockedReason
```

- `retryAllowed`와 `retryBlockedReason`은 재시도가 왜 일어났는지 또는 왜 일어나지 않았는지를 남긴다(예: [Mutation 안전성 게이트](#mutation-안전성-게이트)에 막혔는지, deadline 소진으로 막혔는지). 재시도가 일어났다는 사실만 남기지 않는다.

### Metric

- 의존성별로 최소 다음을 추적한다:

```text
request_total
request_failed_total
retry_attempt_total
retry_exhausted_total
request_duration_ms
```

- circuit breaker 상태와 전환에는 별도 metric이 있으며, [API Circuit Breaker 정책](./circuit-breaker.md)에 정의되어 있고 여기서 중복하지 않는다.
- retry budget에는 별도 metric이 있으며, [API Retry Budget 정책](./retry-budget.md)에 정의되어 있고 여기서 중복하지 않는다.

## 다른 Fault-Tolerance 관심사와의 상호작용

- 재시도 정책만으로는 완전한 회복성 전략이 되지 않는다.
  - timeout/deadline, circuit breaker 조합, retry budget, idempotency mutation 재시도 게이트와 그 idempotent receiver 메커니즘, DB 트랜잭션 재시도, 재시도 관측성은 이미 다른 곳에서 다룬다.
  - [Backoff와 Jitter](#backoff와-jitter), [재시도 대상 오류](#재시도-대상-오류), [관측성](#관측성), [API Circuit Breaker 정책](./circuit-breaker.md), [API Retry Budget 정책](./retry-budget.md), [API Idempotent Receiver 정책](./idempotent-receiver.md), [API 트랜잭션 재시도 정책](./transaction-retry.md) 참고.
