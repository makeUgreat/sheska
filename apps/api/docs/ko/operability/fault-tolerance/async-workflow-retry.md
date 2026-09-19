---
title: API 비동기 & Workflow 재시도 정책
lang: ko
audience: both
applies_to:
  - apps/api
source: ../../../en/operability/fault-tolerance/async-workflow-retry.md
last_synced: 2026-09-19
read_when:
  - 메시지 큐 consumer, dead letter queue/redrive policy, 또는 여러 단계로 구성된 workflow, activity, saga의 재시도 동작을 정의, 구현, 리뷰할 때.
related:
  - ./index.md
  - ./retry.md
---

# API 비동기 & Workflow 재시도 정책

- 이 문서는 호출자가 동기적으로 기다리지 않는 작업의 재시도를 다룬다: 큐 consumer, dead letter 처리, 여러 단계로 구성된 workflow나 saga 실행.

## 적용 범위

- 이 문서는 큐 consumer, dead letter queue(DLQ)/redrive policy, workflow·activity·saga 단계의 재시도 동작을 판단할 때 사용한다.
- [API 재시도 정책](./retry.md)과 [API Timeout & Deadline 정책](./timeout-deadline.md)은 호출자가 정해진 시간 안에서 동기적으로 응답을 기다리는 호출의 재시도를 다룬다. 이 문서는 호출자가 이미 응답을 받고 돌아간 뒤에도 계속되는 작업을 다룬다.
- retry budget, circuit breaker, idempotency, 관측성은 별개의 fault-tolerance 관심사이며 아직 정식 컨벤션 문서로 승격되지 않았다.
  - 현재 승격 상태는 [API Fault Tolerance 인덱스](./index.md)에서 확인한다.
- 이 문서는 일반 원칙을 다루되, [Outbox Relay Retry](#outbox-relay-retry)처럼 이 프로젝트가 이미 구현 방식을 정한 메커니즘은 해당 절에서 구체적으로 기술한다. 구체적인 설정값이나 임계치는 그 메커니즘의 구현 방식이 정해진 뒤에만 추가한다.

## 동기 재시도와 다른 문제인 이유

- 작업이 호출자의 동기 경로를 벗어나면(큐에 들어간 메시지, 오래 실행되는 workflow), 그 작업의 시간 예산을 갖고 기다리는 호출자가 없으므로 [deadline propagation](./timeout-deadline.md)은 [동기 재시도](./retry.md)만큼 중요하지 않다.
- 대신 재시도의 시간보다 양이 더 중요해진다: 핵심 질문은 "얼마나 오래 걸리는가"가 아니라 "몇 번 실패하면 포기하고 격리시킬 것인가"다.

## Message Processing Retry

### Consumer Retry

- 메시지나 job 처리가 실패하면, 완료로 간주하지 않고 나중에 다시 시도할 수 있도록 재전달한다.
- 재전달로 같은 메시지가 여러 번 처리될 수 있으므로, 자연스럽게 반복 실행에 안전하지 않은 작업이라면 그 작업이 여러 번 실행돼도 안전하게 만들거나 처리 완료 여부를 별도로 기록해야 한다.

### Dead Letter Queue와 Redrive Policy

- 일정 횟수 이상 실패한 메시지는 무한히 재시도하는 대신 격리한다. 그렇지 않으면 정상 메시지들의 처리까지 지연시킨다(head-of-line blocking).
- 이는 메시징 환경에서 단일 요청에 대한 [Max Retry](./retry.md#max-retry)와 같은 역할을 한다: 포기하고 다음 단계로 넘기지, 무한히 재시도하지 않는다.

### Outbox Relay Retry

- integration event 전달의 재시도 소유자는 outbox relay다. 다른 어떤 계층도 그 전달을 다시 시도하지 않으며, relay 자신도 dispatcher 호출을 어댑터 계층 재시도로 감싸지 않는다.
  - in-process dispatcher가 리스너를 동기적으로 실행하므로, relay 시도 1회는 네트워크 전송만이 아니라 그 dispatch가 촉발하는 작업 전체를 다시 실행한다. relay 시도 1회를 [예외: Workflow 단위 재시도](./retry.md#예외-workflow-단위-재시도) 의미의 workflow 단위 재시도로 취급한다.
- event를 dispatch하기 전에 먼저 claim한다: 같은 문장에서 시도 횟수를 올리고 다음 시도 시각을 앞으로 밀며, 다른 인스턴스가 이미 잡고 있는 row는 건너뛴다.
  - dispatch 전에 claim하는 것이 relay를 여러 인스턴스에서 돌려도 안전하게 만드는 핵심이다. claim 없이 조회만 하면 두 인스턴스가 같은 event를 동시에 dispatch한다.
  - 앞으로 민 다음 시도 시각은 lease 역할을 겸한다. dispatch 도중 프로세스가 죽어도 아무것도 반환되지 않지만, lease가 만료되면 그 event는 다시 claim 대상이 된다.
- 재시도 간격은 [Backoff와 Jitter](./retry.md#backoff와-jitter)의 공식대로 지수 backoff + full jitter로 벌린다. 폴링 주기는 만기된 event를 얼마나 자주 확인하는지를 정할 뿐, 실패한 전달이 얼마나 기다리는지를 정하지 않는다.
- `maxAttempts`만큼 실패한 event는 무한히 재시도하는 대신 dead letter로 표시해 격리한다.
  - 격리된 event는 outbox 테이블에 그대로 남고 claim 쿼리에서만 제외된다. 별도 테이블이나 큐로 옮기지 않는다: 여기서는 테이블이 곧 큐이므로, broker에서 메시지를 옮겨 얻는 격리를 상태 컬럼으로 동일하게 얻는다.
  - redrive는 자동이 아니라 의도적인 수동 결정이다:

```sql
UPDATE outbox_messages SET dead_lettered_at = NULL, attempt_count = 0, next_attempt_at = now()
WHERE event_id = '...'
```

- 현재 값:

```ts
maxAttempts: 14
baseDelayMs: 1_000
maxDelayMs: 600_000
claimLeaseMs: 30_000
batchSize: 100
```

- 이 값에서 격리까지의 창은 최대 약 57분이고, full jitter가 기댓값을 절반으로 줄이므로 평균은 그 절반 정도다. 약 한 시간보다 짧은 인프라 장애로는 정상 event가 격리되지 않도록 고른 값이다.
- 이 값들을 고정 상수로 취급하지 않는다. 이유는 [Backoff와 Jitter](./retry.md#backoff와-jitter)가 말하는 것과 같다: 관측한 데이터로 측정해 조정하고, dispatch 경로의 동작이 바뀌면 다시 검토한다.
- dead letter 알림은 그 자체를 하나의 integration event로 발행하고, 자기가 소유한 event를 어떻게 보상할지는 각 bounded context가 결정한다. relay는 격리된 event가 무슨 의미인지 알 수 없다.
  - 이 알림은 best-effort이며 outbox에 적재하지 않는다(순환이 된다). durable한 기록은 dead letter 컬럼이다.
- [API 로깅 정책](../logging.md)에 따라 재시도 예약은 `warn`으로, 격리는 `error`로 기록한다. 포함할 필드:

```text
eventId
eventType
attempt
maxAttempts
delayMs
retryAllowed
retryBlockedReason
```

  - 이는 [API 재시도 정책](./retry.md)의 [관측성](./retry.md#관측성) 필드를 의존성 호출이 아닌 event 기준으로 옮긴 것이다. 에러의 타입과 스택은 로깅 어댑터가 이미 남기므로 재시도 필드로 중복해서 넣지 않는다.

### Embedding Chunk Job Retry

- chunk job이 자신이 수행하는 임베딩 호출의 재시도를 소유한다. job 안에서 이루어지는 호출에 대해서는 embedder 자체의 호출 단위 재시도를 끈다(`maxRetries: 0`). [예외: workflow 단위 재시도](./retry.md#예외-workflow-단위-재시도)가 요구하는 바이며, 두 횟수가 곱해지지 않게 한다.
- workflow가 아니라 실패한 chunk를 재시도한다. 실패한 job 하나만 다시 돌고, 이미 성공한 형제 chunk의 결과는 그대로 남아 재시도가 끝나면 parent가 모아 쓴다.
  - 이것이 flow로는 가능하고 호출자 쪽 재업로드로는 불가능한 점이다. source 전체를 다시 올리면 새 sync job id가 생기므로 모든 chunk를 다시 임베딩한다.
- `failParentOnFailure`가 걸린 parent는 자식이 **시도를 모두 소진한 뒤에만** 실패한다. 자식에게 재시도가 남아 있으면 job은 완료되지 않고 delayed로 이동하며 parent는 건드려지지 않는다.
- 큐의 `failed` 이벤트는 재시도가 남은 시도에서도 **매번** 발생한다. `attemptsMade`가 job의 `attempts`에 도달했을 때만 종단 실패로 취급한다. 더 일찍 반응하면 재시도가 남아 있는데도 sync job 전체를 실패로 보고하게 된다.
- 현재 값:

```ts
attempts: 3
backoff: { type: 'exponential', delay: 1_000, jitter: 1 }
```

- `jitter: 1`이면 broker의 지수 backoff가 `[0, delay * 2 ** (attempt - 1)]` 구간 전체로 퍼지며, 이는 [Backoff와 Jitter](./retry.md#backoff와-jitter)가 요구하는 full jitter 공식과 같다. 공식의 `maxDelay` clamp는 시도 3회로는 도달할 수 없어 생략했다.
- 시도 3회는 [Max Retry](./retry.md#max-retry)가 background job에 부여하는 횟수다.

## Workflow Retry

### Durable Execution

- durable execution은 workflow 상태를 지속적으로 영속화해서, 죽은 프로세스가 처음부터가 아니라 중단된 지점부터 재개할 수 있게 한다.
- 그 자체로 재시도 기법은 아니며, 아래 두 패턴(workflow/activity retry, saga retry)이 어디서부터 재개해야 할지 알기 위해 의존하는 기반 인프라다.

### Workflow와 Activity Retry

- workflow 전체(global retry)가 아니라 실패한 개별 단계만(local retry) 재시도하는 편을 우선한다. 더 작은 단위를 재시도하는 편이 이미 완료된 작업의 손실이 적고 비용도 낮기 때문이다.

### Saga Retry

- 여러 서비스에 걸친 saga는 실패한 단계를 재시도하고, 재시도로도 해결이 안 되면 이미 완료된 이전 단계들을 보상 트랜잭션(compensating transaction)으로 되돌린다.
- saga retry는 이 문서의 다른 패턴과 달리 "어떻게 재시도할 것인가"뿐 아니라 "재시도 자체가 실패하면 어떻게 할 것인가"까지 정의해야 한다. DB 트랜잭션처럼 자동으로 되는 cross-service 롤백이 없으므로 보상 로직을 직접 작성해야 한다.
