---
title: API 영속성 정책
lang: ko
audience: both
applies_to:
  - apps/api
source: ../../en/persistence/persistence.md
last_synced: 2026-09-07
read_when:
  - 데이터베이스 스키마, migration, 영속성 어댑터, mapper, 저장소 제약을 변경할 때.
related:
  - ../architecture/ddd.md
  - ../architecture/infrastructure.md
  - ../architecture/source-dependency.md
  - ./repository-methods.md
  - ../operability/observability.md
---

# API 영속성 정책

## 적용 범위

- 데이터베이스 스키마, migration, 영속성 어댑터와 mapper에 이 정책을 사용한다.
- 이 문서의 범위를 벗어나는 결정에는 관련 컨벤션을 사용한다.
  - 도메인 소유권과 repository contract 이름은 [DDD 컨벤션](../architecture/ddd.md)을 따른다.
  - 레이어 경계는 [source dependency 컨벤션](../architecture/source-dependency.md)을 따른다.
  - adapter 파일과 디렉터리는 [Infrastructure 컨벤션](../architecture/infrastructure.md)을 따른다.
  - 호출부의 메서드 선택은 [repository 메서드 가이드](./repository-methods.md)를 따른다.
- 영속성 코드는 데이터베이스와 ORM 세부 사항을 알아도 된다.
- 영속성 코드는 비즈니스 의미의 출처가 되어서는 안 된다.

## 책임 경계

- 도메인 코드는 도메인 불변식과 비즈니스 불변식을 소유한다.
- 애플리케이션 코드는 use case 조율과 애플리케이션 계약 제약을 소유한다.
  - 여기에는 transaction boundary, authorization, 입출력 흐름이 포함된다.
- 영속성 코드는 애플리케이션이 소유한 port를 통해 상태를 저장하고 복원한다.
- 영속성 코드는 도메인이나 비즈니스 불변식을 테이블 검증으로 중복 구현해서는 안 된다.
- 영속성 코드는 신뢰할 수 있는 행, 관계, 조회에 필요한 구조적 무결성을 보장해도 된다.

## 저장 형태

### 데이터베이스 제약

- 구조적 제약에는 다음 항목을 사용할 수 있다.
  - Primary key와 foreign key.
  - Unique와 not-null constraint.
  - Index와 timestamp 같은 저장 기본값.
- 조회 식별자, idempotency key, application contract의 저장소 유일성에는 unique constraint를 사용한다.
- 데이터베이스 고유 enum type을 사용하지 않는다.
  - Enum과 유사한 값은 scalar column에 저장한다.
  - 허용 값의 의미는 이를 소유하는 domain 또는 application contract에 둔다.
- Domain validation을 `CHECK`, enum restriction, trigger 또는 이에 준하는 기능으로 중복 구현하지 않는다.
  - 비어 있지 않은 문자열, 숫자 범위, 상태 전이, 내용 일관성 등이 domain 소유 규칙에 해당한다.

### 검색 벡터 열

- `tsvector` 열은 색인 대상 field와 같은 테이블에 둔다.
- `GENERATED ALWAYS AS (...) STORED`로 정의한다.
  - 애플리케이션 코드가 파생 값을 직접 쓰면 안 된다.
  - Trigger가 다른 aggregate 테이블의 파생 열을 갱신하면 안 된다.
- 조회 쿼리가 여러 aggregate를 join하고 순위를 계산하더라도 각 검색 벡터는 분리한다.
  - 예를 들어 `posts.title_search_vector`와 `sources.content_search_vector`를 따로 둔다.
- CJK bigram 분리 같은 공용 tokenization은 migration에 한 번만 정의한다.
  - 순수한 `IMMUTABLE` SQL 또는 PL/pgSQL function을 사용한다.
  - 중복하거나 애플리케이션 코드에 구현하지 않고 generated column에서 재사용한다.
- 검색 벡터는 비즈니스 규칙이 아니라 저장 무결성과 조회 성능을 위한 projection으로 취급한다.

### Drizzle Schema

- Drizzle 테이블 정의는 저장 형태, 관계, index, 구조적 제약을 설명한다.
- `pgEnum`이나 이에 준하는 migration output으로 PostgreSQL enum type을 정의하지 않는다.
- Domain invariant나 business invariant에는 Drizzle `check` definition을 사용하지 않는다.
- Adapter 사용 편의를 위한 TypeScript 타입 좁히기는 허용한다.
  - 검증과 상태 전이의 책임은 도메인 코드에 남는다.
- 생성된 migration과 snapshot은 최신 schema output뿐 아니라 의도한 정책과 일치해야 한다.

## 경계 매핑

- 영속성 mapper는 infrastructure 경계에서 데이터베이스 행과 도메인 객체를 변환한다.
- Mapper는 다음 책임을 소유한다.
  - 영속성 행 형태 검증.
  - 영속성 행에서 도메인 객체로 복원.
  - 도메인 객체에서 insert row로 변환.
- 데이터베이스 행은 domain construction 또는 restoration API를 통해 복원한다.
  - 복원 경로는 domain event를 기록하지 않으면서 도메인 불변식을 검증해야 한다.
- Domain restoration exception은 변경하지 않고 전파한다.
  - 어댑터에서 복원 중 발생했다는 이유만으로 persistence error로 바꾸지 않는다.
- Aggregate mapper는 복원하는 aggregate 또는 entity 단위로 나눈다.
  - 관련 없는 mapping을 하나의 adapter 공용 mapper에 모으지 않는다.
- Domain-to-insert mapping은 이미 invariant를 통과한 도메인 객체를 신뢰해도 된다.
  - 어댑터에 별도의 저장소 전용 제약이 있을 때만 검증을 추가한다.

## Repository 어댑터

- Repository 구현은 데이터베이스 호출과 query 구성을 소유한다.
- 어댑터 맥락이 장애 이해에 도움이 되면 vendor 또는 storage error를 감싼다.
  - 이 규칙을 domain restoration exception에는 적용하지 않는다.
- 도메인 객체를 반환하는 `save`는 데이터베이스가 반환한 행에서 객체를 복원해야 한다.
  - 원래 입력 객체를 반환하지 않는다.
- Repository와 mapper 파일 이름은 [Infrastructure 명명 규칙](../architecture/infrastructure.md)을 따른다.

### Raw SQL Operation Name

- `db.execute`에 전달하는 raw Drizzle `sql` template에서는 첫 verb와 다음 token을 한 줄에 둔다.
  - `SELECT\n  id, name`이 아니라 `SELECT id, name`으로 작성한다.
- `@opentelemetry/instrumentation-pg`는 첫 일반 공백을 기준으로 operation name을 만든다.
  - Verb 뒤 개행은 같은 논리적 operation에 다른 telemetry label을 만들 수 있다.
  - Telemetry label 정책은 [옵저버빌리티 컨벤션](../operability/observability.md)을 참고한다.

## 리뷰 점검

- 각 데이터베이스 제약이 도메인 불변식을 중복하지 않고 저장 무결성을 보호하는가?
- Drizzle schema가 비즈니스 의미를 도메인 또는 애플리케이션 레이어에 남기는가?
- Repository와 mapper 변경이 경계에서 도메인 검증을 유지하는가?
- 반환하는 저장 상태가 데이터베이스 반환 행에서 만들어지는가?
