---
title: API Persistence 정책
lang: ko
audience: both
applies_to:
  - apps/api
source: ../en/persistence.md
last_synced: 2026-06-30
related:
  - ./architecture.md
  - ./ddd.md
  - ./source-dependency.md
---

# API Persistence 정책

Persistence policy는 database와 ORM adapter가 domain rule의 소유자가 되지 않으면서 저장된 데이터를 보존하는 방식을 정한다.

## 적용 범위

- 이 정책은 API persistence adapter, database schema, migration, persistence mapper에 적용한다.
- Domain ownership은 DDD convention을 따르고, layer boundary는 source dependency convention을 따른다.
- Persistence code는 database와 ORM detail을 알 수 있지만 business meaning의 출처가 되어서는 안 된다.

## 저장소 소유권

### 책임 경계

- Domain code가 domain invariant와 business invariant를 소유한다.
- Application code는 use-case orchestration, transaction boundary, 권한/입출력 흐름, application-owned contract constraint를 소유한다.
- Persistence code는 application port를 위해 state를 저장하고 복원한다.
- Persistence code는 database table validation으로 domain invariant나 business invariant를 강제해서는 안 된다.
- Persistence code는 신뢰할 수 있는 row, relation, lookup에 필요한 storage integrity를 강제할 수 있다.

## 저장 형태

### Database Constraint

- 허용되는 structural constraint에는 primary key, foreign key, unique constraint, not-null column, index, timestamp 같은 storage default가 포함된다.
- Repository lookup identity, idempotency key, application contract가 요구하는 storage-level uniqueness를 보호할 때 unique constraint를 사용한다.
- Database-native enum type은 사용하지 않는다. Enum-like value는 scalar column에 저장하고, 허용 값의 의미는 그 값을 소유하는 domain 또는 application contract에 둔다.
- Value object 또는 aggregate validation을 `CHECK` constraint, database enum restriction, trigger, 또는 이에 준하는 table-level validation으로 중복 구현하지 않는다.
- Domain이 소유하는 규칙의 예시는 trim된 non-empty string, numeric range, lifecycle status transition, content-derived consistency check다.

### Drizzle Schema

- Drizzle table definition은 storage shape, relation, index, structural constraint를 설명해야 한다.
- Drizzle `pgEnum` 또는 그에 준하는 migration output으로 PostgreSQL enum type을 정의하지 않는다.
- Domain invariant나 business invariant에는 Drizzle `check` definition을 피한다.
- Adapter ergonomics를 위해 Drizzle schema에서 TypeScript-only narrowing을 사용할 수 있지만, validation과 state transition의 소유자는 domain code다.
- Generated migration과 snapshot은 단순히 최신 local schema output이 아니라 의도한 persistence policy와 일치해야 한다.

## 경계 매핑

### Repository Mapping

- Persistence mapper는 infrastructure boundary에서 database row와 domain object를 변환한다.
- Database row를 domain object로 복원할 때도 domain construction 또는 restoration API를 거쳐야 한다.
- Domain restoration이 저장된 row를 domain failure value로 거부하면 domain model을 약화하거나 persistence failure로 이름을 바꾸지 말고 해당 failure를 그대로 유지한다.

### Persistence Mapper 정책

- Repository implementation은 database call, query composition, vendor 또는 storage-only failure를 repository contract failure로 변환하는 책임을 소유한다.
- Persistence mapper는 복원 입력의 shape validation, persistence row에서 domain으로 복원하는 책임, domain object를 insert row로 변환하는 책임을 소유한다.
- Persistence mapper의 restore method는 throw 대신 `Result`를 반환하는 것을 기본으로 한다. Domain restoration이 domain failure를 반환하면 mapper와 repository는 그 failure를 그대로 통과시켜야 한다.
- Row를 복원하는 중 발생했다는 이유만으로 mapper가 반환한 domain failure를 repository failure 또는 persistence failure로 감싸지 않는다.
- Aggregate persistence mapper는 복원 대상 aggregate 또는 entity 단위로 나누는 것이 좋다. 관련 없는 aggregate mapping을 하나의 adapter-wide mapper에 모으지 않는다.
- Persistence adapter file name은 `{domain-name}.{purpose-or-adapter}.{role}.ts` 순서로 읽히게 해서 subject, boundary, role을 정렬하고 검색하기 쉽게 둔다.
- Persistence mapper file은 `{aggregate-or-entity}.persistence.mapper.ts`, class는 `{AggregateOrEntity}PersistenceMapper`로 이름 짓는다. 예: `source.persistence.mapper.ts`, `SourcePersistenceMapper`.
- Concrete repository adapter file은 `{aggregate-or-entity}.{adapter}.repository.ts`, class는 `{AggregateOrEntity}{Adapter}Repository`로 이름 짓는다. 예: `source.drizzle.repository.ts`, `SourceDrizzleRepository`.
- Failure mapper file은 mapping 대상이 aggregate나 entity가 아니라 failure family라면 `{owner}-failure.mapper.ts`를 사용할 수 있다.
- Persistence에서 복원되는 domain object는 domain invariant를 검증하고 domain event를 기록하지 않는 `restore` 경로를 노출해야 한다.
- Domain object를 반환하는 repository `save` method는 원래 입력 object가 아니라 database가 반환한 row에서 복원한 domain object를 반환해야 한다.
- Domain-to-insert mapping은 이미 domain invariant를 통과한 domain object를 신뢰할 수 있다. Adapter에 추가 storage-only constraint가 있을 때만 insert validation을 중복할 수 있다.

## 리뷰 점검

- 새 database constraint가 storage integrity를 보호하는지, domain invariant를 재구현하는지 확인한다.
- Drizzle schema change가 database를 business meaning의 소유자로 만들지 않는지 확인한다.
- Repository와 mapper change가 boundary에서 domain validation을 유지하는지 확인한다.
