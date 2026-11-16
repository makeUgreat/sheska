---
title: API 컨텍스트 통합 컨벤션
applies_to:
  - apps/api
read_when:
  - 한 bounded context가 다른 bounded context의 데이터나 동작을 필요로 할 때
  - domain event, integration event, outbox를 정하거나 바꿀 때
related:
  - ./context-map.md
  - ./source-dependency.md
---

# API 컨텍스트 통합 컨벤션

## 이벤트
- 이벤트 종류는 전달 채널이 아니라 소유권으로 정함
  - 한 bounded context 안의 사실은 domain event, 경계를 넘는 사실은 integration event임
  - 비동기로 보내거나 저장한다는 이유로 종류를 바꾸지 않음
- use case를 끝내는 데 꼭 필요한 다음 동작은 이벤트가 아니라 명시적인 호출로 함
- integration event는 원시 데이터만 담음
- 받은 integration event는 신뢰할 수 없는 입력으로 보고 consumer가 검증함

## Outbox
- outbox를 쓸지는 같은 process인지가 아니라 내구성과 원자성이 필요한지로 정함
  - 커밋된 변경이 반드시 일으켜야 하는 반응이면 outbox를 쓰고, 그 변경과 같은 트랜잭션에서 저장함
  - 유실을 허용하는 알림에는 쓰지 않음

## Pull과 Push
- 다른 컨텍스트의 데이터는 요청할 때 조회하는 것(Pull)이 기본임
- producer 장애가 consumer를 자주 떨어뜨리거나 컨텍스트가 다른 process로 나뉘면 read model(Push)로 바꿈
- port 계약을 공통 모듈에 두지 않음. 두 컨텍스트를 묶는 숨은 허브가 됨

## 구현 규칙
- port는 consumer가 소유하고 consumer의 언어로 이름 지음. consumer가 쓰는 메서드만 두고 consumer의 타입을 반환함
- adapter는 consumer의 ACL에 둠. ACL은 기술 adapter와 다른 레이어임
- adapter는 producer의 application port에만 바인딩함. 맞는 port가 없으면 producer가 만듦
- 다른 컨텍스트는 `index.ts`로만 import하고, `index.ts`는 application port와 그 token만 내보냄
- 여러 출처의 데이터 조합은 controller가 아니라 use case가 함

## 읽기 모델의 크로스 컨텍스트 SQL 예외
- 읽기 전용 query는 순위나 집계를 한 쿼리에서 계산해야 할 때만 다른 컨텍스트의 테이블을 읽을 수 있음. 쓰기는 허용하지 않음
  - port로 나누면 메모리에서 다시 순위를 매겨야 해서 순위 품질과 페이지네이션이 깨짐
- 지금 해당하는 것은 post 검색 하나임
- 정적 검사는 이 예외를 잡지 못함. producer의 테이블을 바꿀 때 이 쿼리를 함께 확인함
