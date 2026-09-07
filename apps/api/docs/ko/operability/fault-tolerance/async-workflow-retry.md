---
title: API 비동기 & Workflow 재시도 정책
lang: ko
audience: both
applies_to:
  - apps/api
source: ../../../en/operability/fault-tolerance/async-workflow-retry.md
last_synced: 2026-09-07
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
- 이 문서는 일반 원칙만 다룬다. 구체적인 메커니즘(broker/엔진별 동작, 설정값, 임계치)은 아직 여기서 정의하지 않으며, 구현 방식이 정해지면 추가한다.

## 동기 재시도와 다른 문제인 이유

- 작업이 호출자의 동기 경로를 벗어나면(큐에 들어간 메시지, 오래 실행되는 workflow), 그 작업의 시간 예산을 갖고 기다리는 호출자가 없으므로 [deadline propagation](./timeout-deadline.md)은 [동기 재시도](./retry.md)만큼 중요하지 않다.
- 대신 재시도의 시간보다 양이 더 중요해진다: 핵심 질문은 "얼마나 오래 걸리는가"가 아니라 "몇 번 실패하면 포기하고 격리시킬 것인가"다.

## Message Processing Retry

### Consumer Retry

- 메시지나 job 처리가 실패하면, 완료로 간주하지 않고 나중에 다시 시도할 수 있도록 재전달한다.
- 재전달로 같은 메시지가 여러 번 처리될 수 있으므로, 자연스럽게 반복 실행에 안전하지 않은 작업이라면 그 작업이 여러 번 실행돼도 안전하게 만들거나 처리 완료 여부를 별도로 기록해야 한다.

### Dead Letter Queue와 Redrive Policy

- 일정 횟수 이상 실패한 메시지는 무한히 재시도하는 대신 격리한다. 그렇지 않으면 정상 메시지들의 처리까지 지연시킨다(head-of-line blocking).
- 이는 메시징 환경에서 단일 요청에 대한 [Max Retry](./retry.md#max-retry), 동기 호출 체인에 대한 circuit breaker와 같은 역할을 한다: 포기하고 다음 단계로 넘기지, 무한히 재시도하지 않는다.

## Workflow Retry

### Durable Execution

- durable execution은 workflow 상태를 지속적으로 영속화해서, 죽은 프로세스가 처음부터가 아니라 중단된 지점부터 재개할 수 있게 한다.
- 그 자체로 재시도 기법은 아니며, 아래 두 패턴(workflow/activity retry, saga retry)이 어디서부터 재개해야 할지 알기 위해 의존하는 기반 인프라다.

### Workflow와 Activity Retry

- workflow 전체(global retry)가 아니라 실패한 개별 단계만(local retry) 재시도하는 편을 우선한다. 더 작은 단위를 재시도하는 편이 이미 완료된 작업의 손실이 적고 비용도 낮기 때문이다.

### Saga Retry

- 여러 서비스에 걸친 saga는 실패한 단계를 재시도하고, 재시도로도 해결이 안 되면 이미 완료된 이전 단계들을 보상 트랜잭션(compensating transaction)으로 되돌린다.
- saga retry는 이 문서의 다른 패턴과 달리 "어떻게 재시도할 것인가"뿐 아니라 "재시도 자체가 실패하면 어떻게 할 것인가"까지 정의해야 한다. DB 트랜잭션처럼 자동으로 되는 cross-service 롤백이 없으므로 보상 로직을 직접 작성해야 한다.
