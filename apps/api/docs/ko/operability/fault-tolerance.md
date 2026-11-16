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
- 한 호출 경로에서 재시도하는 계층은 하나뿐이어야 함
  - 재시도 횟수는 경로를 따라 곱해짐. SDK나 큐 재배달처럼 우리가 쓰지 않은 코드의 재시도도 곱해지므로 소유자가 아닌 곳의 재시도는 끔
- 재시도 소유자는 외부 의존성을 직접 호출하는 adapter임. adapter가 retry loop와 오류 분류를 가짐
- 호출자는 예산(deadline, `maxRetries`)만 `callContext`로 넘김. adapter에 하드코딩하지 않음
  - adapter 하나가 예산이 다른 호출자 여럿을 상대함
- workflow 전체를 다시 실행하는 경로(queue job, outbox relay, 충돌한 트랜잭션)에서는 그 안의 adapter 재시도를 0으로 둠

## 재시도 조건
- mutation은 멱등할 때만 재시도함. 멱등성이 필요한 범위는 다시 실행되는 작업 단위 전체임
- 재시도 대상은 adapter가 분류함. 요청이 처리되지 않았거나 서버가 재시도를 기대하는 실패만 재시도함
- 재시도 간격은 exponential backoff와 full jitter로 벌림. `Retry-After`가 있으면 그 값을 우선함
- delay가 deadline까지 남은 시간을 넘으면 재시도하지 않음
- adapter의 backoff는 짧게 둠. 긴 backoff가 필요하면 소유자를 다시 정함
  - 기다리는 동안 위 계층 전체가 자원을 붙잡음
- (미구현) 재시도 결정마다 시도 횟수, delay, 막힌 이유를 로그로 남김. adapter의 재시도는 호출자에게 보이지 않음

## 트랜잭션 재시도
- 동시성 충돌로 실패한 트랜잭션은 트랜잭션을 시작한 계층이 콜백 전체를 다시 실행함
  - read-modify-write는 읽기부터 다시 함. 쓰기만 다시 하면 같은 충돌이 반복됨
  - 다시 실행해도 안전한 근거는 멱등성이 아니라 원자성임
- 재시도되는 트랜잭션 안에서 외부 호출을 하지 않음. lock을 오래 잡고 관계없는 실패가 엮임
- 제약 위반은 재시도하지 않음. 동시성이 아니라 데이터의 문제임

## Deadline과 Timeout
- 요청을 처음 받는 계층이 deadline을 한 번 계산하고 아래 계층에 그대로 넘김
  - 계층마다 timeout을 새로 시작하면 상위가 이미 쓴 시간을 모름
- 시도 하나의 상한은 per-attempt timeout과 남은 시간 중 작은 값임. 남은 시간이 모자라면 시도하지 않음
- deadline과 per-attempt timeout을 값 하나로 합치지 않음. 호출자의 예산과 adapter의 판단은 소유자가 다름
- (미구현) 프로세스 경계를 넘을 때는 절대 시각이 아니라 남은 시간을 넘김

## Outbox Relay
- integration event 전달의 재시도 소유자는 outbox relay임. relay 시도 1회는 dispatch가 일으키는 작업 전체를 다시 실행함
- relay는 dispatch 전에 event를 claim하고 다음 시도 시각을 미래로 밂
  - 인스턴스가 여럿이어도 같은 event를 두 번 보내지 않고, 미룬 시각이 lease 역할을 함
- 시도를 모두 쓴 event는 outbox 테이블의 컬럼으로 격리함. redrive는 사람이 정함
- 격리까지의 창은 약 1시간임. 1시간보다 짧은 장애로는 정상 event가 격리되지 않음
- dead letter 알림은 integration event로 발행하고 outbox를 거치지 않음. 거치면 순환이 생김

## Queue Job
- 실패한 chunk만 다시 실행함. 성공한 chunk 결과는 남아 parent가 모아 씀
- BullMQ의 `failed` 이벤트는 재시도가 남아도 매번 발생함. 시도를 모두 쓴 때만 종단 실패로 처리함
