---
title: Repository 메서드 사용 가이드
applies_to:
  - apps/api
read_when:
  - 애플리케이션 호출부에서 repository 또는 query port 메서드를 선택할 때.
related:
  - ../architecture/ddd.md
  - ../architecture/context-integration.md
  - ./persistence.md
  - ../operability/error.md
---

# Repository 메서드 사용 가이드

## 적용 범위

- 호출부에서 repository와 query port 메서드를 선택할 때 이 가이드를 사용한다.
- 이 가이드의 범위를 벗어나는 결정에는 관련 정책을 사용한다.
  - 메서드 이름과 repository contract: [DDD 컨벤션](../architecture/ddd.md).
  - 데이터베이스와 mapper 동작: [영속성 정책](./persistence.md).
  - Exception 소유권과 변환: [오류 정책](../operability/error.md).

## `get`과 `find`

### 선택 기준

- 부재가 애플리케이션 흐름을 결정하는 예상 가능한 상태라면 `find`를 사용한다.
  - 일치하는 항목이 없으면 `null`을 반환한다.
- 호출자가 항목의 존재를 요구한다면 `get`을 사용한다.
  - 항목을 반환하거나 `NotFoundError`를 던진다.
  - 반환 타입에 `null`을 포함하지 않는다.

### 분기에는 `find` 사용

- 호출부가 부재 여부에 따라 분기해야 할 때 `find`를 사용한다. 예시는 다음과 같다.
  - Aggregate가 없으면 생성하고 있으면 갱신한다.
  - 예상 가능한 race로 대상이 제거된 event를 건너뛴다.
- 부재를 확인한 뒤 충돌 오류를 던지기만 하는 분기는 만들지 않는다. 유일성 강제는 아래
  [집합 불변 조건](#집합-불변-조건은-데이터베이스가-강제한다)을 따른다.

```ts
const source = await this.sources.find({ externalSourceId });
if (!source) {
  return this.persistChange(Source.create({ externalSourceId, ...snapshot }));
}
source.syncContentSnapshot(snapshot);
```

```ts
const syncJob = await this.syncJobs.find({ id: event.syncJobId });
if (!syncJob) return;
```

### 필수 상태에는 `get` 사용

- Use case를 계속 실행하려면 항목이 반드시 필요할 때 `get`을 사용한다.

```ts
const post = await this.posts.get({ id: command.postId });
// null 분기가 필요하지 않다.
```

- `find`를 호출한 직후 같은 의미의 `not_found` 오류를 던지기만 해서는 안 된다.
  - Repository의 not-found 오류가 필요한 의미를 이미 담고 있다면 `get`을 사용한다.
  - 부재를 별도의 application-owned failure로 변환해야 한다면 `find`를 유지한다.

## `insert`와 `update`와 `upsert`

### 선택 기준

- 쓰기 메서드는 이름이 **충돌 시 동작**을 말해야 한다.
  - `insert`: 이미 있으면 실패한다.
  - `update`: 없으면 실패한다.
  - `upsert`: 둘 다 실패하지 않는다.
- `save`는 사용하지 않는다. 충돌 시 동작을 이름이 말하지 않아 구현의 `onConflict` 절에 숨는다.
- 호출부가 생성인지 갱신인지 알면 `insert` 또는 `update`를 쓴다.
  - 호출부가 분기를 이미 갖고 있다면 그 정보를 헬퍼로 합류시키며 버리지 않는다.
- 멱등성이 요구사항이라 호출부가 알 필요조차 없을 때만 `upsert`를 쓴다.
  - 재시도되는 event handler처럼 같은 입력을 여러 번 적용해도 같은 결과여야 하는 경우다.
  - `upsert`는 충돌 대상과 덮어쓰는 field를 계약에 명시한다. 명시하지 않으면 갱신에서 빠진 field가
    조용히 유실된다.

### 집합 불변 조건은 데이터베이스가 강제한다

- Aggregate 집합 전체에 걸친 유일성은 aggregate 하나로 강제할 수 없다.
- 애플리케이션의 사전 조회는 동시성 아래에서 유일성을 보장하지 못한다. 예측이지 강제가 아니다.
- 유일성은 데이터베이스 제약으로 강제하고, adapter가 그 위반을 application이 소유한 failure로 번역한다.
  - 규칙은 port 계약에 적어 도메인 레이어에 남긴다.
  - 강제하지 못하는 사전 조회를 강제처럼 보이게 두지 않는다.
  - Adapter의 오류 번역은 [오류 정책](../operability/error.md)을 따른다.

## Repository와 Query Port

### Aggregate와 Projection

- 호출자에게 도메인 객체가 필요하면 repository를 사용한다.
  - 반환된 aggregate의 도메인 동작을 호출한다.
  - 변경 전에 도메인 상태를 평가한다.
  - `get`, `find`, `list`로 완전한 aggregate를 하나 이상 복원한다.
- 호출자에게 도메인 동작이 필요 없는 조회 projection이 필요하면 application query port를 사용한다.
  - 페이지네이션 또는 검색 결과를 반환한다.
  - 여러 aggregate나 context의 field를 조합한다.
  - Aggregate를 복원하지 않고 application result에 맞는 데이터를 만든다.
- 반환되는 행의 개수가 아니라 필요한 결과와 동작을 기준으로 선택한다.

### JOIN 정책

- Repository 구현은 하나의 aggregate 내부 테이블을 join해도 된다.
  - Aggregate root, child entity, embedded value object를 복원할 때만 사용한다.
  - 다른 aggregate나 bounded context를 repository 결과에 join해서는 안 된다.
- Query port 구현은 조회 projection을 만들기 위해 aggregate나 bounded context 경계를 넘어 join해도 된다.
  - Query contract의 소유권은 이를 소비하는 application 레이어에 둔다.
  - Cross-context 접근은 [context integration 컨벤션](../architecture/context-integration.md)을 따른다.

### Query Port 메서드 이름

- 결과 계약에 맞는 표준 이름을 사용한다.
  - `get`: 항목 하나를 반환하고 없으면 예외를 던진다.
  - `find`: 항목 하나를 반환하고 없으면 `null`을 반환한다.
  - `paginate`: 페이지 결과를 반환한다 (호출자의 탐색 요구에 따라 cursor 방식 또는 page 번호 방식).
  - `search`: query에 대한 관련도 순 페이지를 반환한다.
  - `count`: 조건에 맞는 항목 수를 반환한다.
  - `exists`: 조건에 맞는 항목이 하나 이상인지 반환한다.
- Context에 필요한 메서드만 정의한다.
  - 미래 사용을 추측해 query 메서드를 추가하지 않는다.

## 리뷰 점검

- 부재가 유효한 분기인가(`find`), 필수 전제 조건 위반인가(`get`)?
- 쓰기 메서드 이름이 충돌 시 동작을 말하는가(`insert`/`update`/`upsert`)?
- `upsert`가 멱등성 요구 때문인가, 호출부가 아는 정보를 버려서인가?
- 유일성을 애플리케이션 사전 조회로 강제하려 하고 있지는 않은가?
- 호출자에게 도메인 객체(repository)가 필요한가, 조회 projection(query port)이 필요한가?
- Repository JOIN이 하나의 aggregate 경계 안에 머무르는가?
- 모든 query port 메서드가 기존 use case에 필요한가?
