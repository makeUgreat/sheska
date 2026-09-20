---
title: API 재시도 정책
applies_to:
  - apps/api
read_when:
  - 외부 의존성(외부 API, LLM, 네트워크 호출, 큐) 호출에 대한 재시도 소유권, 재시도 횟수, backoff, 어떤 오류가 재시도 대상인지를 정의, 구현, 리뷰할 때.
related:
  - ./index.md
  - ./timeout-deadline.md
  - ./async-workflow-retry.md
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
- retry budget 비율, budget window, retry budget이 개별 호출 재시도와 어떻게 조합되는지는 이 문서가 아니라 [API Retry Budget 정책](./retry-budget.md)에 정의되어 있다.
- idempotency의 mutation 재시도 게이트는 [재시도 대상 오류](#재시도-대상-오류)에 정의되어 있다. 더 넓은 idempotent receiver 정책(자연적 멱등성 판단 기준, idempotency key 생성·저장·중복 제거)은 이 문서가 아니라 [API Idempotent Receiver 정책](./idempotent-receiver.md)에 정의되어 있다.
- 재시도 결정이 남겨야 하는 structured log 필드와 metric은 [관측성](#관측성)에 정의되어 있다.
  - 이벤트를 로그로 남길지, 어떤 레벨로 남길지는 [API 로깅 정책](../logging.md)을 따르고, 로그·메트릭을 어떻게 전송할지는 [API 옵저버빌리티 컨벤션](../observability.md)을 따른다. 이 문서는 재시도 고유의 내용만 정의한다.

## 재시도 소유권

- 하나의 요청 경로에는 재시도 소유자가 정확히 하나여야 한다. 즉 실패한 호출을 다시 시도하는 계층은 하나뿐이다.
  - 재시도는 요청 하나의 성공 확률을 높이려고 의존성의 처리 능력을 더 쓰는 행위다. 실패가 드물고 일시적일 때는 싼 거래지만, 과부하 때문에 생긴 실패에서는 재시도가 과부하를 더 키우고 원인이 해소된 뒤에도 부하를 계속 높게 유지해서 회복을 지연시킨다.
  - 재시도 횟수는 호출 경로를 따라 더해지는 게 아니라 곱해진다. 5단계 서비스 스택을 거쳐 DB 질의로 끝나는 호출에서 각 계층이 3번씩 재시도하면, DB가 실패하기 시작한 순간 DB에 최대 243배의 부하가 몰려 회복이 사실상 불가능해진다.
- 재시도 소유자는 설계 시점에 고정하고, 경로의 나머지 계층에는 재시도 코드를 아예 넣지 않는다.
  - 소유자를 고정하는 방식은 판단이 단순하고, 경로의 코드를 읽는 것만으로 검증할 수 있다.
  - 다른 방식으로 신호 기반 소유권이 있다. 실패한 계층 바로 위가 재시도하되, 포기할 때 "과부하이니 재시도하지 말 것"이라는 신호를 위로 올려보내 상위 계층이 재시도하지 않게 막는 방식이다. 이미 끝낸 작업을 버리지 않으면서 곱셈도 막지만, 경로의 모든 계층이 그 신호를 이해하고 따라야 성립하므로 이 프로젝트가 통제하지 않는 코드를 지나는 경로에서는 쓸 수 없다.

### 경로에 이미 켜져 있는 재시도

- 재시도 값을 조정하기 전에, 호출 경로 전체에서 이미 켜져 있는 재시도를 찾아 소유자를 제외한 모든 곳에서 끈다.
  - 같은 경로의 다른 계층이 같은 실패를 몰래 재시도하고 있으면 두 횟수가 곱해지므로, 재시도 횟수를 정하는 일 자체가 의미를 잃는다.
  - 이 곱셈은 잘 보이지 않는다. 우리가 작성한 재시도는 코드에 드러나지만, 그것과 곱해지는 쪽은 대개 우리가 작성하지 않은 코드다.
- 최소한 다음 지점에 기본값으로 재시도가 켜져 있는지 확인한다:

```text
HTTP 클라이언트 라이브러리 또는 벤더 SDK의 기본 재시도
서비스 메시나 사이드카 프록시의 재시도 정책
로드밸런서·게이트웨이의 재시도
메시지 큐의 재배달
브라우저·모바일 클라이언트의 자동 재요청
오프라인 동기화 프로토콜
```

### 소유자의 위치

- 재시도는 상위 계층이 아니라 외부 의존성을 직접 호출하는 client 또는 adapter 계층이 소유한다.
  - client/adapter 계층은 실패 지점에 가장 가까운 계층이다. 그래서 여기서 재시도하면 위쪽에서 이미 끝낸 작업을 버리지 않고, 그 계층의 호출만 멱등하면 되며, 실패 원인에 대한 가장 정확한 정보를 가지고 판단할 수 있다.
- 상위 계층(application 계층의 use case, 또는 HTTP controller나 queue consumer 같은 presentation 계층 진입점)은 직접 retry loop를 만들지 않고 client/adapter 계층의 재시도 정책에 위임한다.
  - 판단을 나누는 기준: 호출자는 재시도 예산(몇 번까지 시도할 수 있고 얼마나 기다릴 수 있는지)을 소유하고, client/adapter는 retry loop와 오류 분류(어떤 실패가 다시 시도할 가치가 있는지)를 소유한다.
    - 예산은 adapter에 하드코딩하지 말고, 이미 deadline을 싣고 다니는 같은 call context에 함께 싣는다. adapter 인스턴스 하나가 시간 예산이 전혀 다른 호출자들을 함께 상대하는 경우가 많아서, 하드코딩한 값 하나로는 양쪽을 다 만족시킬 수 없다.
    - 오류 분류는 adapter에 둔다. 어떤 실패가 일시적인지는 호출자가 아니라 의존성에 대한 지식이다.
    - 이건 이 절이 금지하는 상위 계층 retry loop가 아니다. 호출자는 값을 넘겨줄 뿐, 호출을 직접 반복하지 않는다.
- 특정 호출 경로에서 아래 축들이 반대 방향을 가리킨다면 이 위치를 다시 검토한다. 같은 실패라도 어느 계층에서 재시도하느냐에 따라 다음이 모두 달라진다:

| 축 | 위에서 재시도 | 실패 지점에 가까운 곳에서 재시도 |
|---|---|---|
| 버려지는 작업 | 큼: 위쪽 계층이 전부 다시 실행됨 | 없음: 실패한 호출만 다시 함 |
| 부작용 반복 | 중간 계층 전부가 멱등해야 함 | 실패 지점에 가까운 계층만 멱등하면 됨 |
| 자원 점유 | 짧고 얕음 | 길고 깊음: 시도와 그 사이 backoff 내내 사슬 전체가 대기 |
| 경로 다양성 | 다시 보낸 요청이 다른 인스턴스로 갈 수 있음 | 이미 맺은 연결, 이미 고른 인스턴스로 다시 감 |
| 판단에 쓸 정보 | 500 하나처럼 뭉개진 오류만 봄 | 연결 거부, 쿼리 타임아웃, 데드락, 과부하 거절 같은 정확한 실패 원인을 앎 |
| 가시성 | 호출자에게 보임 | 호출자에게 숨겨짐 |

- 다음 경우에는 실패 지점에 가까운 곳이 재시도를 소유한다:
  - 위쪽 계층이 이미 끝낸 작업이 비싸거나 부작용이 있는 경우. 위에서 재시도하면 그 작업을 전부 다시 실행하고 부작용도 다시 일으킨다.
  - 실패가 특정 다운스트림 한 곳에 국한된 경우. 요청 전체를 다시 보내도 가까운 곳에서 재시도하는 것 이상으로 얻는 게 없다.
  - 긴 backoff 없이 재시도가 짧게 끝나는 경우. 깊은 곳의 재시도는 그게 도는 동안 위쪽 계층 전부를 붙잡아 둔다.
- 다음 경우에는 상위 계층이 재시도를 소유한다:
  - 사슬이 얕고 각 계층이 가벼운 경우(비용이 낮은 control-plane/data-plane 연산 등). 버려지는 작업이 적다.
  - 다운스트림이 여러 인스턴스로 복제되어 있어서, 다시 보낸 요청이 다른 인스턴스로 가는 실익이 있는 경우.
  - 경로 전체가 멱등한 경우. 위에서 재시도하면 중간 계층의 부작용이 시도마다 반복되기 때문이다.
  - 긴 backoff가 필요한 경우. 깊은 곳에서 오래 기다리면 그 위 모든 계층의 스레드와 커넥션을 deadline까지 붙잡고 있게 되고, 일부 요청의 실패가 사슬 전체의 장애로 번진다.

### 예외: workflow 단위 재시도

- 재시도 단위가 단일 외부 호출이 아니라 통째로 다시 실행해야 의미가 있는 workflow 전체일 때는 상위 계층이 재시도할 수 있다.
  - 예: saga나 orchestration의 한 단계를 atomic하게 다시 실행해야 한다면, 그 안의 호출 하나만 재시도하지 않고 saga/orchestrator 단위로 재시도한다.
  - 예: BullMQ job 단위 재시도는 job 안에서 실패한 외부 호출 하나가 아니라 job 전체를 다시 실행한다.
    - 이 프로젝트가 그렇게 실행하는 chunk job은 [Embedding Chunk Job Retry](./async-workflow-retry.md#embedding-chunk-job-retry)를 참고한다.
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

- 이미 어려움을 겪고 있는 의존성에 부하를 더하지 않도록 재시도 간격을 벌린다.
  - 시도마다 delay를 키우는 것(exponential backoff)은 느리거나 실패 중인 의존성을 계속 두드리지 않게 한다.
  - 그 delay를 무작위화하는 것(jitter)은 여러 caller가 같은 순간에 몰려서 재시도하는 것(retry storm)을 막는다.
- exponential backoff와 full jitter를 사용한다:

```ts
delay = random(0, min(maxDelay, baseDelay * 2 ** attempt))
```

- `baseDelay`와 `maxDelay`를 고정 상수로 취급하지 않는다.
  - 이 값들은 대상 의존성의 실제 latency와 실패 복구 양상에 크게 좌우된다.
  - 값을 미리 고정하지 말고 관측 데이터를 측정해서 조정한다.
  - 의존성의 동작이 바뀌면(예: downstream이 느려지거나, 새로운 rate limit이 생기거나, 트래픽 패턴이 달라지면) 한 번 정한 값을 고수하지 말고 다시 조정한다.
- 재시도 소유자가 client/adapter 계층인 동안에는 backoff를 짧게 유지하고, 깊은 곳에서 backoff를 길게 늘리는 대신 재시도 소유자를 다시 검토한다.
  - client/adapter 계층의 backoff는 기다리는 내내 그 위 모든 계층의 스레드와 커넥션을 붙잡는다. backoff가 길수록 이 점유 비용이 커진다. [소유자의 위치](#소유자의-위치)를 참고한다.
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
- 이 게이트가 요구하는 멱등성의 범위는 실패한 호출 하나가 아니라 다시 실행되는 작업 단위 전체다.
  - 상위 계층이 재시도를 소유하면 중간 계층의 부작용이 전부 다시 일어나므로, 그 계층들이 각각 이 게이트를 만족해야 한다. [소유자의 위치](#소유자의-위치)를 참고한다.
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

- 이 분류는 실패 원인을 아직 볼 수 있는 계층, 즉 호출을 직접 수행한 client/adapter 계층에서 한다.
  - 상위 계층까지 올라가면 클라이언트 오류와 서버 오류의 경계가 흐려지고, 대개 오류 하나로 뭉개진 채 도착한다.
  - 최종적 일관성은 이 경계를 더 흐린다. 지금 클라이언트 오류로 거절된 요청이 잠시 뒤에는 성공하기도 한다.

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
- client/adapter 계층이 소유한 재시도는 호출자에게 보이지 않는다. 그래서 이 필드들이 호출자와 운영자가 재시도가 있었다는 사실을 확인할 수 있는 유일한 통로다.

### Metric

- 의존성별로 최소 다음을 추적한다:

```text
request_total
request_failed_total
retry_attempt_total
retry_exhausted_total
request_duration_ms
```

- retry budget에는 별도 metric이 있으며, [API Retry Budget 정책](./retry-budget.md)에 정의되어 있고 여기서 중복하지 않는다.

## 다른 Fault-Tolerance 관심사와의 상호작용

- 재시도 정책만으로는 완전한 회복성 전략이 되지 않는다.
  - timeout/deadline, retry budget, idempotency mutation 재시도 게이트와 그 idempotent receiver 메커니즘, DB 트랜잭션 재시도, 재시도 관측성은 이미 다른 곳에서 다룬다.
  - [Backoff와 Jitter](#backoff와-jitter), [재시도 대상 오류](#재시도-대상-오류), [관측성](#관측성), [API Retry Budget 정책](./retry-budget.md), [API Idempotent Receiver 정책](./idempotent-receiver.md), [API 트랜잭션 재시도 정책](./transaction-retry.md) 참고.
