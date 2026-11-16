---
title: API 영속성 정책
applies_to:
  - apps/api
read_when:
  - DB schema, migration, repository, query port, mapper를 바꿀 때
  - 호출부에서 repository나 query port 메서드를 고를 때
related:
  - ../architecture/ddd.md
  - ../operability/error.md
---

# API 영속성 정책

## 데이터베이스 제약
- 규칙을 DB에 둘지는 동시 쓰기에서 애플리케이션이 스스로 보장할 수 있는지로 정함
  - 유일성은 애플리케이션이 보장하지 못함. 동시에 돈 두 트랜잭션이 모두 "행이 없음"을 읽고 둘 다 insert함. 두 번째를 거부할 수 있는 것은 DB뿐임
  - 비어 있지 않은 문자열, 숫자 범위, 허용된 상태 값은 쓰기 전에 도메인 객체가 이미 보장함. `CHECK`로 다시 쓰면 고칠 곳만 둘로 늘어남
- 비즈니스 규칙이라도 유일성 규칙이면 unique constraint로 강제함. 예: source 하나에 post 하나
  - 규칙의 뜻은 여전히 도메인이 소유하고 검사함. 제약은 그 검사가 경쟁 조건을 이기지 못해서 둠
- 도메인 검증을 `CHECK`, PG enum, trigger로 다시 구현하지 않음. enum 같은 값은 scalar column에 두고, 허용 값의 뜻은 도메인이 소유함

## 검색 벡터 열
- `tsvector` 열은 색인 대상 field와 같은 테이블에 `GENERATED ALWAYS AS (...) STORED`로 둠
  - 애플리케이션 코드가 파생 값을 쓰지 않음. trigger가 다른 aggregate 테이블의 열을 갱신하지 않음
- 여러 aggregate를 join해 순위를 매기더라도 검색 벡터는 테이블마다 따로 둠
- CJK bigram 같은 공용 tokenization은 migration에 `IMMUTABLE` function으로 한 번만 정의하고 generated column에서 재사용함

## Mapper
- DB 행은 도메인의 복원 API로 도메인 객체를 만듦. 복원은 domain event를 기록하지 않지만 불변식은 검증함
- 복원 중 생긴 도메인 exception은 그대로 전파함. adapter 안에서 났다는 이유로 persistence error로 바꾸지 않음
- mapper는 aggregate마다 나눔. 관련 없는 매핑을 공용 mapper에 모으지 않음
- 도메인 객체를 돌려주는 쓰기 메서드는 DB가 돌려준 행으로 객체를 복원함. 입력 객체를 그대로 돌려주지 않음

## Repository 메서드
- `find`는 부재가 예상 가능한 분기일 때 씀. 없으면 `null`을 돌려줌
- `get`은 항목이 반드시 있어야 할 때 씀. 없으면 `NotFoundError`를 던지고 반환 타입에 `null`이 없음
  - `find` 직후 같은 뜻의 not found 오류를 던지기만 하면 `get`을 씀. 부재를 다른 application failure로 바꿔야 할 때만 `find`를 남김
- 조회 조건은 원시값이 아니라 객체로 받고, 필드를 메서드 이름에 넣지 않음. 예: `findBySourceId(sourceId)`가 아니라 `find({ sourceId })`
  - 조건이 늘어도 메서드가 아니라 조건 타입이 늘어서, 필드 조합마다 메서드가 생기지 않음
  - 필드에 이름이 붙어 같은 타입 인자의 순서가 바뀌는 실수가 사라짐. 컴파일러는 이 실수를 잡지 못함
- 쓰기 메서드 이름은 충돌할 때의 동작을 말함. `save`는 쓰지 않음. 충돌 동작이 구현의 `onConflict`에 숨기 때문임
  - `insert`: 이미 있으면 실패함. `update`: 없으면 실패함. `upsert`: 둘 다 실패하지 않음
  - 호출부가 생성인지 갱신인지 알면 `insert`나 `update`를 씀
  - `upsert`는 멱등성이 요구사항일 때만 씀. 예: 재시도되는 event handler. 충돌 대상과 덮어쓰는 field를 계약에 적음
- 여러 aggregate에 걸친 유일성은 사전 조회가 아니라 DB 제약으로 강제하고, adapter가 그 위반을 오류로 번역함
  - 사전 조회는 동시성 아래에서 예측일 뿐 강제가 아님. 강제처럼 보이게 두지 않음

## Repository와 Query Port
- 도메인 객체의 동작이 필요하면 repository를 씀. repository 조회는 쓰기를 위한 조회임
- 도메인 동작 없이 보여 줄 projection이 필요하면 application이 소유한 query port를 씀. 예: 페이지네이션, 검색, 여러 aggregate 조합
  - 고르는 기준은 행의 개수가 아니라 필요한 결과와 동작임
- repository는 한 aggregate 안의 테이블만 join함. query port는 projection을 위해 aggregate와 컨텍스트 경계를 넘어 join할 수 있음
  - 컨텍스트 경계를 넘는 SQL은 [context integration 컨벤션](../architecture/context-integration.md#읽기-모델의-크로스-컨텍스트-sql-예외)의 예외만 허용함
- query port 메서드는 결과 모양에 맞는 이름을 씀: `get`, `find`, `paginate`, `search`, `count`, `exists`. 쓰지 않을 메서드를 미리 만들지 않음

## Raw SQL
- raw `sql` template에서는 첫 verb와 다음 token을 한 줄에 둠. eslint의 `sql-verb-same-line`이 검사함
  - `@opentelemetry/instrumentation-pg`는 첫 공백까지로 operation name을 만듦. verb 뒤 개행은 같은 연산을 다른 telemetry label로 쪼갬
