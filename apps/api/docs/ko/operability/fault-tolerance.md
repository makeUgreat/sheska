---
title: API Fault Tolerance 정책
applies_to:
  - apps/api
read_when:
  - 외부 의존성 호출, DB 트랜잭션, outbox relay, queue job의 재시도나 timeout, deadline을 정하거나 바꿀 때
related:
  - ./error.md
---

# API Fault Tolerance 정책

## 재시도 소유자
- 한 호출 경로에서 실패한 호출을 다시 시도하는 계층은 하나뿐이어야 함
  - 재시도 횟수는 경로를 따라 곱해짐. 계층 3개가 3번씩 재시도하면 의존성에는 최대 27배의 부하가 몰림
  - SDK, 프록시, 큐 재배달처럼 우리가 쓰지 않은 코드에 켜진 재시도도 같이 곱해짐. 소유자가 아닌 곳의 재시도는 모두 끔
- 재시도 소유자는 외부 의존성을 직접 호출하는 adapter임
  - adapter가 retry loop와 오류 분류를 가짐. 어떤 실패가 일시적인지는 의존성에 대한 지식임
  - 호출자는 예산만 가짐. 예산은 `callContext`의 deadline과 `maxRetries`로 넘기고, adapter에 하드코딩하지 않음
    - adapter 하나가 예산이 다른 호출자 여럿을 상대함. 값 하나로는 양쪽을 맞출 수 없음
  - 상위 계층(use case, controller, consumer)은 retry loop를 만들지 않음
- `maxRetries`에는 기본값이 없음. 호출자가 호출마다 정함
- workflow 전체를 다시 실행하는 경로에서는 그 안의 adapter 재시도를 0으로 둠
  - 해당 경로: BullMQ chunk job, outbox relay 시도, 충돌한 DB 트랜잭션
  - 두 계층이 함께 재시도하면 횟수가 곱해짐. 예: job 3회 x adapter 3회 = 최대 9회 호출

## 재시도 조건
- mutation은 멱등할 때만 재시도함. 이 조건은 아래 오류 분류보다 우선함
  - 멱등성이 필요한 범위는 실패한 호출 하나가 아니라 다시 실행되는 작업 단위 전체임
  - 재시도가 필요한 mutation이 멱등하지 않으면 재시도하지 않고 멱등하게 만듦
- adapter는 실패 원인을 볼 수 있는 자리에서 오류를 분류함
  - 재시도함: timeout, 연결 실패, 429, 5xx. 요청이 처리되지 않았거나 서버가 재시도를 기대하는 경우임
  - 재시도하지 않음: 그 밖의 4xx, validation, 인증과 권한 오류. 다시 보내도 결과가 같음
  - 상위 계층에 오면 원인이 오류 하나로 뭉개져서 분류할 수 없음
- 재시도 간격은 exponential backoff와 full jitter로 벌림
  - 응답에 `Retry-After`가 있으면 계산한 delay보다 그 값을 우선함
  - delay가 deadline까지 남은 시간을 넘으면 재시도하지 않음
  - adapter의 backoff는 짧게 둠. 기다리는 동안 위 계층 전체가 자원을 붙잡음. 긴 backoff가 필요하면 소유자를 다시 정함
- (미구현) 외부 호출과 트랜잭션의 재시도 결정마다 시도 횟수, delay, 막힌 이유를 로그로 남김
  - adapter의 재시도는 호출자에게 보이지 않음. 로그가 재시도를 확인할 유일한 통로임

## 트랜잭션 재시도
- 동시성 충돌(serialization failure, deadlock, optimistic concurrency 충돌)로 실패한 트랜잭션은 콜백 전체를 다시 실행함
  - 트랜잭션을 시작하는 계층이 재시도를 소유함
  - read-modify-write는 읽기부터 다시 함. 쓰기만 다시 하면 낡은 값으로 같은 충돌이 반복됨
  - 다시 실행해도 안전한 근거는 멱등성이 아니라 원자성임. 실패한 시도는 아무것도 반영하지 않음
- 트랜잭션 재시도의 backoff는 외부 호출보다 훨씬 짧게 둠. 충돌한 상대 트랜잭션은 대개 이미 끝났음
- 재시도되는 트랜잭션 안에서 외부 호출을 하지 않음
  - DB lock을 오래 잡고, 관계없는 외부 실패가 충돌 재시도와 엮임
- unique, foreign key 같은 제약 위반은 재시도하지 않음. 동시성이 아니라 데이터의 문제임

## Deadline과 Timeout
- deadline은 재시도를 포함한 호출 사슬 전체가 끝나야 하는 절대 시각임. timeout은 시도 하나에 허용하는 기간임
- 요청을 처음 받는 계층이 deadline을 한 번 계산하고, 프로세스 안의 모든 계층에 그대로 넘김
  - 계층마다 timeout을 새로 시작하면 상위가 이미 쓴 시간을 모름
- 시도 하나의 상한은 adapter의 per-attempt timeout과 deadline까지 남은 시간 중 작은 값임
  - 남은 시간이 시도 하나에도 모자라면 새 시도를 시작하지 않음
- deadline과 per-attempt timeout을 값 하나로 합치지 않음
  - deadline은 호출자의 예산이고 per-attempt timeout은 adapter의 판단임. 소유자가 다름
- (미구현) 프로세스 경계를 넘을 때는 절대 시각이 아니라 남은 시간을 넘김. 호스트 사이의 clock 차이가 절대 시각을 틀리게 함

## Outbox Relay
- integration event 전달의 재시도 소유자는 outbox relay임
  - in-process dispatcher가 listener를 동기로 실행함. 그래서 relay 시도 1회는 그 dispatch가 일으키는 작업 전체를 다시 실행함
- relay는 dispatch 전에 event를 claim함. 시도 횟수를 올리고 다음 시도 시각을 미래로 밂
  - claim이 relay를 인스턴스 여러 개로 돌려도 같은 event를 두 번 보내지 않게 함
  - 미래로 민 시각이 lease 역할을 함. dispatch 중 프로세스가 죽으면 lease가 끝난 뒤 다시 claim 대상이 됨
- 시도를 모두 쓴 event는 dead letter로 표시해 격리함
  - 격리는 outbox 테이블의 컬럼으로 함. 테이블이 곧 큐라서 다른 테이블이나 큐로 옮기지 않음
  - 격리까지의 창은 최대 약 1시간임. 1시간보다 짧은 인프라 장애로는 정상 event가 격리되지 않게 고른 값임
  - redrive는 자동이 아니라 사람이 정함
- dead letter 알림은 integration event로 발행하고, 보상은 그 event를 소유한 bounded context가 정함
  - 알림은 best-effort이고 outbox를 거치지 않음. outbox를 거치면 순환이 생김. 영구 기록은 dead letter 컬럼임

## Embedding Chunk Job
- chunk job이 임베딩 호출의 재시도를 소유함. job 안의 embedder 재시도는 0임
- 실패한 chunk만 다시 실행함. 이미 성공한 chunk 결과는 남아서 parent가 모아 씀
  - 호출자가 source를 다시 올리면 새 sync job이 생겨 모든 chunk를 다시 임베딩함
- BullMQ의 `failed` 이벤트는 재시도가 남은 시도에서도 매번 발생함. `attemptsMade`가 `attempts`에 도달했을 때만 종단 실패로 처리함
  - 더 일찍 반응하면 재시도가 남았는데도 sync job 전체를 실패로 보고함
