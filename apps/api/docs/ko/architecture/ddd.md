---
title: API 도메인 모델 컨벤션
applies_to:
  - apps/api
read_when:
  - bounded context를 나누거나 이름 지을 때
  - aggregate, entity, value object의 경계와 API를 설계할 때
  - 도메인 메서드가 원시값과 도메인 객체 중 무엇을 받을지 정할 때
related:
  - ./context-integration.md
  - ../persistence/persistence.md
---

# API 도메인 모델 컨벤션

## Bounded context
- 컨텍스트 이름은 aggregate가 아니라 컨텍스트가 담는 능력으로 지음
  - aggregate 이름을 붙이면 두 번째 aggregate가 들어갈 자리가 없음
- aggregate가 늘었다는 사실은 컨텍스트를 나눌 근거가 아님. 같은 단어가 양쪽에서 다른 뜻일 때 나눔
- 한쪽이 다른 쪽 테이블을 직접 읽어야만 동작하면 두 컨텍스트가 아니라 하나임

## Aggregate
- 다른 aggregate는 root의 ID로 참조함
- aggregate 내부 상태는 root의 메서드로만 바꿈
- 여러 aggregate의 조율은 application이 함. 같은 bounded context 안에서 의미가 분명하면 단방향 의존을 허용함
- repository는 불변식 검증에 필요한 상태를 모두 복원함. 복원 비용이 부담되면 aggregate가 너무 큰지 먼저 의심함

## 도메인 이벤트
- aggregate는 domain event를 기록만 하고 발행하지 않음
- 기록된 event는 전달이 성공한 뒤에만 지움

## 캡슐화
- 다른 객체의 상태를 꺼내 판단하지 않고 그 객체에게 시킴(Tell, Don't Ask)
  - 판단이 밖에 있으면 쓰는 곳마다 복사되고, 상태 모양을 바꿀 때 모두 고쳐야 함
- entity와 aggregate는 getter 대신 의도가 드러나는 메서드를 둠
- `getProps()`는 매핑처럼 도메인 판단을 하지 않는 곳에서만 씀. 판단에 쓴 곳이 리뷰에서 드러남

## 도메인 메서드 입력
- 원시값과 도메인 객체 중 무엇을 받을지는 값의 출처로 정함. `restore`에는 적용하지 않음
  - 도메인 밖에서 오는 값은 [데이터 경계](./data-boundary.md)를 따라 도메인 객체로 바꿈
  - 이미 도메인 객체인 값은 `unpack()`했다가 다시 만들지 않음. 검증된 값이라는 보장이 타입에서 끊김
  - 원시값으로 꺼내는 것은 도메인을 떠날 때만 함
- 입력값 하나에 대응하는 value object는 application이 만들어 넘김
- 여러 입력에서 파생되는 value object는 aggregate가 재료를 받아 만듦. application이 만들면 상태 구성 방식이 새어 나감
- 여러 모양 중 하나인 입력은 aggregate가 원시값으로 받음. 모양을 가르는 판단은 도메인이 함
- 같은 컨텍스트의 다른 aggregate 상태가 필요한 판단은 그 aggregate를 인자로 받고, 상태를 꺼내지 않고 물음
- 도메인 객체끼리 비교할 때는 도메인 타입으로 받음. 원시값은 서로 바꿔 넣어도 컴파일됨

## 타입 선언
- 메서드 타입은 다른 레이어가 import해야 할 때만 export함
- aggregate와 entity 파일은 상태 타입을 클래스 위에, 나머지 타입을 파일 맨 아래에 둠
