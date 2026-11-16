---
title: API 도메인 모델 컨벤션
applies_to:
  - apps/api
read_when:
  - bounded context를 나누거나 이름 지을 때
  - aggregate, entity, value object의 경계와 API를 설계할 때
  - 도메인 메서드가 원시값과 도메인 객체 중 무엇을 받을지 정할 때
related:
  - ./context-map.md
  - ./context-integration.md
  - ../persistence/persistence.md
---

# API 도메인 모델 컨벤션

## Bounded context
- 컨텍스트 이름은 컨텍스트가 담는 모델이나 능력으로 지음. aggregate 이름이나 테이블 이름을 쓰지 않음
  - aggregate 이름을 붙이면 두 번째 aggregate가 들어갈 자리가 없음. 실제로는 같은 모델인데 ACL, port, 레이어를 새로 얻게 됨
  - 예: `library`(노트를 동기화하고 발행함), `ingestion`(본문을 임베딩으로 만듦)
- aggregate가 하나 더 생겼다는 사실은 컨텍스트를 나눌 근거가 아님
  - aggregate는 일관성 경계이고 컨텍스트는 언어 경계임. 나눌 근거는 같은 단어가 양쪽에서 다른 뜻이라 번역이 필요하다는 것임
- 컨텍스트를 나눴으면 데이터 접근에서도 경계가 성립해야 함. 한쪽이 다른 쪽 테이블을 직접 읽어야만 동작하면 두 모델이 아니라 하나임

## Aggregate
- 다른 aggregate는 객체가 아니라 root의 ID로 참조함
- aggregate 내부의 상태는 root의 메서드로만 바꿈. 외부 코드는 내부 entity나 value object를 꺼내지 않음
- 여러 aggregate의 조회, 생성, 저장 순서는 application이 조율함
  - 예외: 같은 bounded context 안에서 도메인 의미가 분명하면 단방향 aggregate 의존과, 다른 aggregate를 만드는 factory method를 허용함
- repository는 root 메서드가 불변식을 검증하는 데 필요한 상태를 모두 복원함
  - aggregate 전체를 매번 복원하는 비용이 부담되면 로딩 최적화보다 aggregate가 너무 큰지 먼저 의심함

## 도메인 이벤트
- aggregate는 domain event를 기록만 하고 발행하지 않음. 수집과 전달은 application이 정함
- 기록된 event는 의도한 전달이 성공한 뒤에만 지움. aggregate나 outbox 저장이 실패하면 남김
- 이벤트 종류와 전달 채널은 [context integration 컨벤션](./context-integration.md#이벤트)을 따름

## 캡슐화
- 다른 객체의 상태를 꺼내 판단하지 않고, 상태를 가진 객체에게 묻거나 시킴(Tell, Don't Ask)
  - 판단이 밖에 있으면 같은 판단이 쓰는 곳마다 복사되고, 상태 모양을 바꿀 때 모두 찾아 고쳐야 함
  - 예: use case가 fingerprint를 꺼내 비교하지 않고 `source.syncJobFor(latestSyncJob)`에 시킴
- entity와 aggregate는 속성 getter 대신 의도가 드러나는 메서드를 둠. 예: `isPublishable`
- `getProps()`는 응답, 저장, read model 매핑처럼 꺼낸 값으로 도메인 판단을 하지 않는 곳에서만 씀
  - 판단에 쓴 호출이 `getProps()`로 드러나서 리뷰에서 찾을 수 있음

## 도메인 메서드 입력
- 매개변수를 원시값과 도메인 객체 중 무엇으로 받을지는 값이 어디서 오는지로 정함. `restore`에는 적용하지 않음
  - 도메인 밖에서 오는 값은 도메인에 들어오는 지점에서 한 번 도메인 객체로 바꿈
  - 이미 도메인 객체인 값은 그대로 넘김. `unpack()`한 뒤 다시 만들지 않음
    - 다시 만들면 "검증된 값"이라는 보장이 타입에서 끊기고 같은 변환이 여러 곳에 적힘
  - 원시값으로 꺼내는 것은 도메인을 떠날 때만 함. 예: repository 조회 조건, 응답, integration event
- 입력값 하나에 대응하는 value object는 application이 만들어 넘김. 예: `ExternalSourceId.of(command.externalSourceId)`
  - application이 정규화된 값으로 조회한 뒤 같은 value object로 aggregate를 만들어서 정규화를 두 번 하지 않음
- 여러 입력에서 파생되는 value object는 aggregate가 재료를 받아 만듦. 예: `SourceEmbedding`이 `EmbeddingVector`를 만듦
  - application이 만들면 aggregate 상태의 구성 방식이 application으로 새어 나감
- `kind`로 갈리는 union 입력은 aggregate가 원시값으로 받고 value object로 바꿈. 어느 모양인지 가르는 판단은 도메인이 함
- 같은 bounded context의 다른 aggregate 상태가 필요한 판단은 그 aggregate를 인자로 받는 메서드에 둠
  - 인자로 받은 aggregate의 상태를 꺼내지 않고 자기 value object를 넘겨 물음. 예: `latestSyncJob.isWaitingOrCompletedFor(fingerprint)`
- 도메인 객체끼리 비교할 때는 도메인 타입으로 받음. 예: `SourceBody.hasSameTextAs(other: SourceBody)`
  - 원시값은 fingerprint `string`과 id `string`을 바꿔 넣어도 컴파일됨. value object 타입은 컴파일되지 않음

## 타입 선언
- 한 메서드에서만 쓰고 이름만으로 이해되는 매개변수와 반환값은 인라인 타입으로 둠
- 메서드 타입은 다른 레이어나 bounded context가 import해야 할 때만 export함. public 메서드라는 이유만으로 `Params`, `Result` 타입을 만들지 않음
- aggregate와 entity 파일은 상태 타입 `XProps`와 그 필드 타입을 클래스 위에, 나머지 타입을 파일 맨 아래에 둠
  - 파일을 열면 상태와 클래스를 먼저 읽고, 입력 타입은 필요할 때 내려가서 봄
