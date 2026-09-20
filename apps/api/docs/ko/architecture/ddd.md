---
title: API DDD 컨벤션
lang: ko
audience: both
applies_to:
  - apps/api
source: ../../en/architecture/ddd.md
last_synced: 2026-09-20
related:
  - ./architecture.md
  - ./context-integration.md
  - ./source-dependency.md
  - ../persistence/persistence.md
  - ../persistence/repository-methods.md
---

# API DDD 컨벤션

## 적용 범위

- 바운디드 컨텍스트 경계, 도메인 모델 소유권, 공유 도메인 언어, 도메인 커널 사용, 리포지토리 계약 이름을 결정할 때 이 문서를 사용한다.
- 이 문서의 범위를 벗어나는 결정에는 관련 컨벤션을 사용한다.
  - 소스 구조는 [architecture 컨벤션](./architecture.md)을 사용한다.
  - import 방향은 [source dependency 컨벤션](./source-dependency.md)을 사용한다.
  - 데이터베이스와 ORM 경계는 [persistence 정책](../persistence/persistence.md)을 사용한다.

## 모델 경계

### 바운디드 컨텍스트

- 바운디드 컨텍스트는 도메인 모델, 보편 언어, 책임 경계를 소유한다.
  - 같은 단어라도 다른 바운디드 컨텍스트에서는 다른 의미를 가질 수 있다.
  - 폴더 이름은 컨텍스트를 나타낼 수 있지만, 경계는 모델, 언어, 책임으로 정당화된다.
- 바운디드 컨텍스트 외부 코드는 컨텍스트 내부 모델을 직접 수정해서는 안 된다.
  - 바운디드 컨텍스트 외부 코드는 컨텍스트 내부 도메인 객체에 의존하지 않는 것이 좋다.
  - 컨텍스트는 ID, DTO, 이벤트, 포트, 부패 방지 계층(anti-corruption layer)을 통해 통신한다.

### 구현 모듈

- 구현 모듈은 실용적인 코드 배선 또는 프레임워크 모듈 단위다.
  - 구현 모듈이 자동으로 DDD 바운디드 컨텍스트가 되는 것은 아니다.

## Aggregate 참조와 접근

### 참조 방식

- 같은 aggregate 내부의 다른 객체는 객체 참조를 사용한다.
- 다른 aggregate는 객체 참조가 아니라 대상 aggregate root의 ID로 참조한다.
- 다른 aggregate의 내부 entity는 직접 참조하지 않는다.

### 접근 경로

- Aggregate 내부 entity와 value object에 대한 모든 상태 변경은 aggregate root 자신의 메서드를 통해서만 이루어진다.
  - 내부 entity는 aggregate root가 호출하는 메서드를 통해 변경되며, 그 변경은 aggregate 경계 안에 머문다.
  - Value object는 불변이라 자기 값을 바꾸는 메서드를 갖지 않는다. Value object를 "변경"한다는 것은 실제로는
    aggregate root가 자신의 필드를 새 value object 인스턴스로 재할당하는 것이며, 그 교체 로직은 value object 자신이
    아니라 root(또는 그 필드를 소유한 내부 entity) 쪽에 있다.
  - Aggregate 외부 코드는 내부 entity나 value object를 직접 꺼내서는 안 된다. Value object의 경우 문제는 값이
    손상될 위험이 아니다 — value object는 애초에 변경될 수 없다 — 그래도 root를 우회하면 aggregate 경계가 감추려는
    내부 구조를 그대로 노출하게 된다. 이로부터 이어지는 getter·snapshot 규칙은 [도메인 캡슐화](#도메인-캡슐화)를
    참조한다.
  - 외부 코드는 항상 root를 통해 aggregate를 조회하고 변경한다.

```ts
const order: Order = await orderRepository.findById(orderId);
order.changeLineQuantity(lineId, 3);
await orderRepository.save(order);
```

- `orderLineRepository.findById()`처럼 내부 entity를 repository로 직접 조회하는 방식은 이 규칙 위반이다.

### Aggregate 간 조율 책임

- 여러 aggregate의 조회·생성·저장 순서 조정은 기본적으로 application 레이어가 담당한다.
- 직접 의존이 순환 의존을 만들거나, 하나의 연산에 여러 aggregate·외부 서비스의 정보가 동시에 필요하면 application
  orchestration 또는 domain event를 사용한다.

### 같은 Bounded Context 내부의 예외

- 도메인 의미가 명확하고 두 aggregate가 같은 bounded context에 속한 경우에 한해, 단방향 aggregate 의존이나 다른
  aggregate를 생성하는 factory method는 허용될 수 있다.
  - 이는 위 조율 책임 원칙의 예외이며, bounded context 경계를 넘는 경우에는 적용되지 않는다.

### Bounded Context 경계

- 위 [바운디드 컨텍스트](#바운디드-컨텍스트) 규칙을 따른다. 다른 바운디드 컨텍스트의 aggregate 타입은 도메인
  레이어에서 직접 참조하지 않는다.

### Repository의 로딩 책임

- 전제: 내부 entity에 대한 모든 상태 변경은 aggregate root의 메서드를 통해서만 이루어진다. Application 코드나 다른
  외부 코드가 내부 entity를 직접 꺼내 수정하는 일은 없다.
- 이 전제가 성립하기 때문에, `order.changeLineQuantity()`와 같은 root 메서드가 `lines` 배열에서 해당 line을 찾아
  수량을 바꾸고 불변식(예: 재고 한도 초과 금지)을 검증하려면, repository가 `findById()` 시점에 이미 `lines`를 함께
  로딩해놨어야 한다. Root 메서드가 실행되는 시점에 필요한 내부 상태가 메모리에 없으면 그 연산 자체가 불가능하다.
- Repository는 도메인 연산이 불변식을 검증하는 데 필요한 aggregate 상태를 완전하게 복원해야 한다.
  - Root 메서드가 내부 entity를 조회·변경한다면, 그 entity도 root와 함께 로딩되어 있어야 한다.
  - JOIN으로 조회할지 여부는 로딩 방식이며 infrastructure 구현 세부사항이지 도메인 규칙이 아니다.
    [JOIN 정책](../persistence/repository-methods.md#join-정책)을 참조한다.

### 경고 신호

- Aggregate 전체를 매번 복원하는 비용이 부담스럽다면, 로딩 최적화를 고민하기 전에 이 aggregate가 너무 큰 것은 아닌지
  먼저 의심한다.

## 도메인 커널

- `kernels/domain`은 여러 컨텍스트의 도메인 레이어가 공유하는 도메인 커널 코드를 담는다.
  - 도메인 커널 코드는 안정적인 도메인 레이어 정책을 포함할 수 있다.
  - 여러 바운디드 컨텍스트가 의도적으로 공유하는 안정적인 도메인 개념을 포함할 수 있다.
  - 공유 도메인 개념을 변경할 때는 영향을 받는 컨텍스트 소유자와 함께 검토한다.
- `kernels/domain`을 일반적인 중복 제거 디렉터리로 사용해서는 안 된다.
  - 공유 개념이 불안정하거나 특정 컨텍스트에만 해당한다면 성급하게 도메인 커널로 옮기기보다 중복을 허용한다.

## 도메인 모델 구성 요소

- DDD 구성 요소는 클래스가 위치한 곳이 아니라 도메인에서 맡는 역할로 선택한다.

### 프로젝트 관련 구성 요소 역할

| 개념           | 역할                                                                                                                                                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entity         | 생명주기 동안 상태가 변할 수 있는 식별자를 가진 도메인 객체.                                                                                                                                                                            |
| Value Object   | 식별자가 아니라 값 자체로 의미가 결정되는 불변 객체.                                                                                                                                                                                    |
| Aggregate      | 일관성을 함께 보호해야 하는 entity와 value object의 묶음.                                                                                                                                                                               |
| Aggregate Root | aggregate 외부에서 접근 가능한 유일한 진입점이며 aggregate 불변 조건을 보호한다.                                                                                                                                                        |
| Repository     | aggregate를 저장하고 다시 가져오는 도메인 컬렉션 형태의 추상화이며 데이터베이스 조회 도우미가 아니다. Repository를 통한 읽기는 **read-for-write**다. 도메인 메서드를 호출하거나 쓰기 전 전제 조건을 검증하기 위해 aggregate를 불러온다. |

### 책임 배치 기준

- 호출자, 저장소, 전송 방식, 유스 케이스 진입점과 무관하게 반드시 지켜야 하는 비즈니스 불변 조건이라면 도메인에 둔다.
- 유스 케이스를 실행하기 위해 무엇을 불러오고, 인가하고, 호출하고, 트랜잭션으로 묶고, 저장할지 결정하는 오케스트레이션은 애플리케이션 레이어에 둔다.
  - 애플리케이션 서비스와 유스 케이스는 필요한 객체를 불러온다.
  - 도메인 메서드 또는 도메인 서비스를 호출한 뒤 변경을 저장한다.
  - 도메인 판단을 직접 구현하지 않는 것이 좋다.
- 조회, 저장, 발행, 외부 API 호출, 기술 라이브러리 사용 방법을 결정하는 구현은 infrastructure 레이어에 둔다.

### Value Object 원시 값 접근

- Value object의 원시 값을 읽을 때는 `unpack()`을 사용한다.
  - 복합 value object에서 여러 필드를 읽을 때는 `unpack()`을 한 번만 호출하고 그 결과를 재사용한다.

## 도메인 이벤트

- Aggregate는 domain event를 기록하지만 직접 발행하지 않는다.
  - 기록한 이벤트를 전달하기 위해 event emitter, event publisher, logger, outbox writer 또는 전송 기술에
    의존해서는 안 된다.
  - 구체 domain event의 `eventName`은 클래스의 `readonly` 리터럴 속성으로 선언한다.
  - 구체 domain event의 `eventName`을 초기화하기 위한 용도로만 모듈 상수를 만들지 않는다.
- 기록된 domain event를 수집하고 전달 방법을 결정하는 책임은 application orchestration에 둔다.
  - 컨텍스트 사이에 전달할 때는 domain event를 integration event로 변환한다.
  - 이벤트를 유실 없이 전달해야 한다면 integration event를 aggregate 변경과 같은 트랜잭션에서 outbox에
    저장한다.
- Aggregate에 기록된 domain event는 의도한 전달이 성공한 후에만 정리한다.
  - Aggregate 또는 outbox 저장이 실패하면 기록된 이벤트를 유지한다.
- Domain event라는 이유만으로 outbox가 필요한 것은 아니다.
  - 현재 유스 케이스를 완료하는 데 반드시 필요한 후속 동작은 비동기 이벤트 전달에 맡기지 않고
    명시적으로 호출한다.
  - 컨텍스트 경계를 넘는 내구성 있는 전달에는 domain event를 integration event로 변환해 outbox에
    저장한다. Domain event 클래스를 integration event용 outbox에 직접 직렬화하지 않는다.
  - 같은 컨텍스트의 비동기 반응에 나중에 내구성 있는 전달이 필요해지면 별도의 내부 durable message
    계약을 정의하고 outbox 정책을 의도적으로 확장한다. 저장이 필요하다는 이유만으로 integration event로
    잘못 분류하지 않는다.
  - Event sourcing에 사용하는 domain event store는 transactional outbox와 다른 영속화 메커니즘이다.

## Repository 메서드 이름

- `save`는 repository 계약을 통해 aggregate를 저장한다.
  - 컨텍스트에 의미 있는 별도 명령이 없다면 생성과 수정에 모두 사용한다.
- `find`는 하나의 애그리거트를 고유 조건으로 조회하고, 없으면 `null`을 반환한다.
  - 조회 의미는 객체 매개변수의 필드 이름으로 전달한다.
  - 예: `find({ id })`, `find({ externalSourceId })`.
- `get`은 호출자가 리소스가 존재한다고 기대한다는 의미다.
  - 반환 타입은 반드시 `Promise<T>`여야 하며, `Promise<T | null>`은 허용하지 않는다.
  - 리소스가 없으면 구현체가 `InfrastructureException(NOT_FOUND)`을 던진다.
  - `find`와 같은 객체 매개변수 명명 방식을 사용한다. 예: `get({ id })`.
- `find`와 `get`의 검색 조건은 반드시 객체 타입이어야 한다.
  - `find(id: string)`이나 `get(sourceId: string)`처럼 원시 값을 직접 받는 것은 허용하지 않는다.
  - `find({ id })`, `get({ id })` 형태로 사용한다.
  - 모든 조회가 같은 호출 형태를 가지므로, 어떤 필드로 찾는지 확인하지 않아도 repository 호출임을 알아볼 수 있다.
  - 조회 조건이 늘어날 때 메서드를 추가하는 대신 검색 조건 타입을 확장하게 되므로, 필드 조합마다 메서드가 하나씩 생기는 일을 막는다.
  - 필드에 이름이 붙으므로 같은 타입 인자끼리 순서가 바뀌는 실수가 사라진다. 이건 컴파일러가 잡아주지 못하는 종류의 실수다.
  - 검색 조건 객체는 하나의 리소스를 식별하는 고유 조회 조건만 표현해야 한다.
  - 여러 결과가 가능한 필터링은 `list`로 표현한다.
- 조회 필드는 메서드 이름에 넣지 않고 검색 조건 객체로 표현한다.
  - 예: `findBySourceId(sourceId)` 대신 `find({ sourceId })`.
  - 이유는 위의 "필드 조합마다 메서드가 생기는 문제"다. `sourceId`는 도메인 개념이므로 `findBySourceId`가 저장 방식을 노출하는 것은 아니다.
- `list`는 페이지네이션 없이 여러 aggregate를 반환한다.
  - 필터링이 필요하면 명시적인 검색 조건 객체를 받는 것이 좋다.
- 저장 방식, 조회 구현, 테이블 형태를 노출하는 repository 메서드 이름은 피한다.
  - 피해야 할 이름의 예: `selectRows`, `findWithJoin`, `queryByIndex`, `upsertRow`.
  - 이런 이름은 도메인이 소유한 계약을 저장 방식에 묶어버리므로, 저장 형태를 바꾸면 계약까지 바꿔야 한다.
- 각 메서드를 호출 지점에서 언제 사용할지에 대한 가이드는 [Repository Method 사용 가이드](../persistence/repository-methods.md)를 참조한다.

## 도메인 캡슐화

- 도메인 객체는 의도가 드러나는 메서드로 동작을 노출하는 것이 좋다.
  - 내부 속성을 그대로 반영하는 일반 getter는 피한다.
  - 호출자가 도메인 상태를 확인하고 외부에서 도메인 판단을 내리게 만드는 snapshot은 피한다.
  - 필드를 꺼내 외부에서 판단하기보다 객체에게 도메인 질문이나 동작을 요청한다.
  - 예: `isPublishable`, `hasContentHash`, `markDeleted`.
- DTO, persistence, presentation 매핑은 레이어 경계에서 명시적인 mapper 또는 목적별 read model을 사용할 수 있지만, 그 형태를 도메인 모델의 기본 API로 만들지 않는다.
- Value object는 값 자체가 도메인 개념일 때 원시 값을 노출할 수 있지만, entity와 aggregate는 동작 중심 API를 선호한다.

## 도메인 API 타입 추출

- 하나의 메서드에서만 쓰이고 메서드 이름만으로 이해하기 쉬운 단순 매개변수나 반환 값은 인라인 객체 타입을 선호한다.
- 하나의 aggregate 안에서 재사용되거나, 시그니처를 지나치게 길게 만들거나, 내부 복원 또는 persistence 매핑 세부사항을 표현하는 형태는 외부에 공개하지 않는 지역 타입을 사용한다.
- 메서드 매개변수, 결과, 상태 타입은 다른 레이어 또는 바운디드 컨텍스트가 안정적인 계약으로 import해야 할 때만 외부에 공개한다.
  - 메서드가 public이라는 이유만으로 `Params`, `Result`, `Status` 타입을 만들지 않는다.
  - 이름 붙일 가치가 있는 타입에는 기계적인 접미사보다 도메인 이름을 선호한다.
  - 이름 붙일 가치가 없다면 형태를 인라인으로 둔다.

## 리뷰 점검

- 다른 aggregate를 객체 참조가 아니라 ID로 참조하는지, 다른 aggregate의 내부 entity를 직접 참조하지 않는지
  확인한다.
- Aggregate의 내부 entity나 value object가 외부 코드의 직접 접근이 아니라 aggregate root 자신의 메서드를 통해서만
  변경되는지 확인한다.
- 여러 aggregate를 조율하는 코드가 같은 bounded context 예외를 제외하면 직접적인 cross-aggregate 의존이 아니라
  application orchestration 또는 domain event에 있는지 확인한다.
- Repository가 현재 호출 지점이 보여줄 필드만이 아니라, root 메서드의 불변식 검증에 필요한 내부 상태까지 로딩하는지
  확인한다.
- 새로운 공유 추상화가 정말 안정적인 도메인 개념인지 확인한 뒤 도메인 커널 코드로 만든다.
- 바운디드 컨텍스트의 공개 언어가 다른 컨텍스트의 내부 모델을 누출하고 있지 않은지 확인한다.
- 도메인 객체가 데이터베이스 행 또는 요청 DTO처럼 동작하지 않고 비즈니스 동작을 표현하는지 확인한다.
- 비즈니스 불변 조건이 애플리케이션 오케스트레이션 또는 infrastructure 구현이 아니라 도메인에 속하는지 확인한다.
- 유스 케이스가 상태를 꺼내 외부에서 도메인 판단을 내리지 않고 도메인 동작을 호출하는지 확인한다.
- Repository가 저장 방식을 조회 도우미로 노출하지 않고 aggregate 저장과 조회를 모델링하는지 확인한다.
- 모델 경계를 넘는 통신이 ID, DTO, 이벤트, 포트, 부패 방지 매핑을 사용하는지 확인한다.
