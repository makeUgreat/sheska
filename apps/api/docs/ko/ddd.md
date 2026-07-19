---
title: API DDD 컨벤션
lang: ko
audience: both
applies_to:
  - apps/api
source: ../en/ddd.md
last_synced: 2026-07-20
related:
  - ./architecture.md
  - ./context-integration.md
  - ./repository-methods.md
---

# API DDD 컨벤션

이 API에서 DDD 용어는 model ownership, language boundary, business behavior를 정의하기 위해 사용한다.
DDD 용어는 단순한 folder name이 아니다.

## 적용 범위

- Bounded context boundary, domain model ownership, shared domain language, domain-kernel usage, repository contract name을 결정할 때 이 문서를 사용한다.
- Source map은 architecture convention을 사용하고, import direction은 source dependency convention을 사용하며, database와 ORM boundary는 persistence policy를 사용한다.

## 모델 경계

### Bounded Context 경계

- Bounded context는 domain model, ubiquitous language, responsibility boundary를 소유한다.
- 같은 단어라도 다른 bounded context에서는 다른 의미를 가질 수 있다.
- bounded context 외부 코드는 context 내부 model을 직접 수정해서는 안 된다.
- bounded context 외부 코드는 context 내부 domain object에 의존하지 않는 것이 좋다.
- Context는 ID, DTO, event, port, anti-corruption layer를 통해 통신한다.
- Folder name은 context를 나타낼 수 있지만, boundary는 model, language, responsibility로 정당화된다.

### Implementation Module 경계

- Implementation module은 실용적인 code wiring 또는 framework module 단위다.
- Implementation module은 자동으로 DDD bounded context가 아니다.
- 다른 bounded context는 internal domain object에 접근하기보다 public application contract, ID, DTO, event, port를 통해 상호작용하는 것이 좋다.

## Domain Kernel 사용 기준

- `kernels/domain`은 context domain layer가 공유하는 domain-layer kernel code를 담는다.
- Domain-kernel code는 stable domain-layer policy와 여러 bounded context가 의도적으로 공유하는 stable domain concept를 포함할 수 있다.
- Shared domain concept 변경은 영향을 받는 context owner와 함께 review한다.
- `kernels/domain`을 generic duplication-removal directory로 사용해서는 안 된다.
- 공유 concept가 불안정하거나 context-specific이라면 premature domain-kernel code보다 duplication을 선호한다.

## Domain Model 구성 요소

DDD 구성 요소는 class가 위치한 곳이 아니라 domain에서 맡는 역할로 선택한다.

### 구성 요소 역할

| 개념 | 역할 |
|---|---|
| Entity | 생명주기 동안 상태가 변할 수 있는 identity를 가진 domain object. |
| Value Object | Identity가 아니라 값 자체로 의미가 결정되는 immutable object. |
| Aggregate | 함께 consistency를 지켜야 하는 entity와 value object의 묶음. |
| Aggregate Root | Aggregate 외부에서 접근 가능한 유일한 진입점이며 aggregate invariant를 보호한다. |
| Domain Method | Entity 또는 aggregate가 domain rule에 따라 자기 상태를 바꾸는 behavior. |
| Domain Service | 하나의 entity, value object, aggregate root에 자연스럽게 속하지 않는 business rule. |
| Repository | Aggregate를 저장하고 다시 가져오는 domain collection-like abstraction이며 database query helper가 아니다. Repository를 통한 읽기는 **read-for-write**다: domain method를 호출하거나 쓰기 전 전제 조건을 검증하기 위해 aggregate를 로드한다. |
| Factory | 복잡한 domain object 생성 규칙을 캡슐화한다. |
| Domain Event | Domain 안에서 이미 발생한 의미 있는 business fact. |
| Specification | 재사용 가능한 domain condition 또는 판정 rule. |

### 책임 배치 기준

- Caller, storage, transport, use case entry point와 무관하게 반드시 지켜야 하는 business invariant라면 domain에 둔다.
- Use case를 실행하기 위해 무엇을 load, authorize, call, transact, save할지 결정하는 orchestration은 application layer에 둔다.
- Query, persist, publish, external API call, technical library 사용 방법을 결정하는 implementation은 infrastructure layer에 둔다.
- Application service와 use case는 필요한 object를 불러오고 domain method 또는 domain service를 호출한 뒤 변경을 저장한다. Domain 판단을 직접 구현하지 않는 것이 좋다.
- Infrastructure adapter는 database, ORM, message broker, external API, file system, SDK, persistence detail을 domain 또는 application contract 뒤에서 구현한다.

### Value Object Raw Value 접근

- Value object의 raw value를 읽을 때는 `unpack()`을 사용한다.
- Composite value object에서 여러 field를 읽을 때는 한 번 local variable로 unpack한 뒤 그 variable에서 field를 읽는다.

## Repository Method 이름

- `save`는 repository contract를 통해 aggregate를 저장한다. Context에 의미 있는 별도 command가 없다면 create와 update에 모두 사용한다.
- `find`는 하나의 aggregate 또는 read model을 unique lookup으로 조회하고, 없으면 `null`을 반환한다.
- `find`의 lookup 의미는 object parameter의 field name으로 전달한다. 예: `find({ id })`, `find({ externalSourceId })`.
- `get`은 caller가 resource가 존재한다고 기대한다는 의미다. 반환 타입은 반드시 `Promise<T>`여야 하며, `Promise<T | null>`은 허용하지 않는다. Resource가 없으면 구현체가 `InfrastructureException(NOT_FOUND)`을 throw한다. 해당 contract에서 부재가 exceptional일 때만 사용하고, 그렇지 않으면 `find`를 선호한다.
- `get`도 `find`와 같은 object parameter naming을 사용한다. 예: `get({ id })`.
- `find`와 `get`의 criteria는 반드시 object 타입이어야 한다. `find(id: string)`이나 `get(sourceId: string)`처럼 primitive를 직접 받는 것은 허용하지 않는다. `find({ id })`, `get({ id })` 형태로 사용한다.
- `list`는 페이지네이션 없이 여러 aggregate를 반환한다. Filtering이 필요하면 explicit criteria object를 받는 것이 좋다. Caller가 domain behavior를 호출하기 위해 full aggregate가 필요할 때 repository에 `list`를 사용한다. 결과가 화면 표시용 flat read-model projection이라면(특히 cursor pagination과 함께 사용될 때) application Query port에 `paginate` 또는 `search`로 정의한다.
- `find`와 `get`의 criteria object는 하나의 resource를 식별하는 unique lookup만 표현해야 한다. 여러 결과가 가능한 filtering은 `list`로 표현한다.
- Storage mechanics, query implementation, table shape를 노출하는 repository method name은 피한다. 특히 field name을 method name에 포함하지 않고 criteria object의 field로 표현한다. 예: `findBySourceId(sourceId)` 대신 `find({ sourceId })`.
- 각 method를 호출 지점에서 언제 사용할지에 대한 가이드는 [Repository Method 사용 가이드](./repository-methods.md)를 참조한다.

## Domain 캡슐화

- Domain object는 internal props를 그대로 반영하는 generic getter보다 의도가 드러나는 method로 behavior를 노출하는 것이 좋다.
- Caller가 domain state를 밖에서 확인하고 domain decision을 외부에서 내리게 만드는 getter와 snapshot은 피한다.
- Field를 꺼낸 뒤 외부에서 판단하기보다 `isPublishable`, `hasContentHash`, `markDeleted`처럼 객체에게 domain question이나 action을 요청한다.
- DTO, persistence, presentation mapping은 layer boundary에서 explicit mapper 또는 목적별 read model을 사용할 수 있지만, 그 shape를 domain model의 기본 API로 만들지 않는다.
- Value object는 값 자체가 domain concept일 때 primitive value를 노출할 수 있지만, entity와 aggregate는 behavior 중심 API를 선호한다.

## Domain API Type 추출

- 하나의 method에서만 쓰이고 method name만으로 이해하기 쉬운 단순 parameter나 return value는 inline object type을 선호한다.
- 하나의 aggregate 안에서 재사용되거나, signature를 지나치게 길게 만들거나, internal restore/persistence mapping detail을 표현하는 shape는 export하지 않는 local type을 사용한다.
- Method parameter, result, status type은 다른 layer 또는 bounded context가 안정적인 contract로 import해야 할 때만 export한다.
- Method가 public이라는 이유만으로 `Params`, `Result`, `Status` type을 만들지 않는다.
- 이름 붙일 가치가 있는 type에는 기계적인 suffix보다 domain name을 선호하고, 그렇지 않으면 shape를 inline으로 둔다.

## 리뷰 점검

- 새로운 shared abstraction이 정말 안정적인 domain concept인지 확인한 뒤 domain-kernel code로 만든다.
- Bounded context의 public language가 다른 context의 internal model을 누출하고 있지 않은지 확인한다.
- domain object가 database row 또는 request DTO처럼 동작하지 않고 business behavior를 표현하는지 확인한다.
- Business invariant가 application orchestration 또는 infrastructure implementation이 아니라 domain에 속하는지 확인한다.
- Use case가 state를 꺼내 외부에서 domain decision을 내리지 않고 domain behavior를 호출하는지 확인한다.
- Repository가 storage mechanics를 query helper로 노출하지 않고 aggregate 저장과 조회를 모델링하는지 확인한다.
- Model boundary를 넘는 통신이 ID, DTO, event, port, anti-corruption mapping을 사용하는지 확인한다.
