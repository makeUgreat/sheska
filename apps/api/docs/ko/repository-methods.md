---
title: Repository Method 사용 가이드
lang: ko
audience: both
applies_to:
  - apps/api
source: ../en/repository-methods.md
last_synced: 2026-07-20
related:
  - ./ddd.md
---

# Repository Method 사용 가이드

이 문서는 [API DDD 컨벤션](./ddd.md)의 이름 규칙을 보완하며, **호출 지점에서 어떤 method를 선택할지**에 대한 가이드를 제공한다. Method 이름이 아닌 사용 시점을 결정할 때 읽는다.

## `get` vs `find`

### 선택 기준

| Method | 부재 시 동작 | 사용 시점 |
|--------|------------|----------|
| `find` | `null` 반환 | Null이 **유효한 상태**로서 비즈니스 흐름의 한 분기를 담당할 때 |
| `get` | `InfrastructureException(NOT_FOUND)` throw | 부재가 **예외 상황** — caller가 resource 존재를 전제할 때 |

### `find`를 사용하는 경우

Null이 의미를 갖는 경우, 즉 에러가 아니라 정상 경로일 때 `find`를 사용한다.

**Upsert** — null이면 생성, non-null이면 업데이트:
```ts
const source = await this.sources.find({ externalSourceId });
if (!source) return this.persistChange(Source.create(...));
source.syncContentSnapshot(snapshot);
```

**충돌 감지** — null이면 진행 허용, non-null이면 충돌:
```ts
const existing = await this.posts.find({ sourceId });
if (existing) throw new ApplicationException({ kind: STATE_CONFLICT, ... });
```

**Graceful skip** — 이벤트 핸들러에서 부재가 예상 가능한 race condition이며 에러가 아닌 경우:
```ts
const syncJob = await this.syncJobs.find({ id: event.syncJobId });
if (!syncJob) return;
```

### `get`을 사용하는 경우

Caller가 resource가 반드시 존재한다고 전제하며, 부재가 버그 또는 클라이언트 오류를 의미할 때 `get`을 사용한다:

```ts
const post = await this.posts.get({ id: command.postId });
// null 체크 불필요 — 없으면 자동으로 NOT_FOUND throw
```

### 피해야 할 안티패턴

`find`의 null을 잡아서 `NOT_FOUND`를 다시 throw하는 것은 `get`이 이미 하는 일을 중복한다:

```ts
// ❌ NOT_FOUND를 재throw하기 위해 find를 사용하지 않는다
const source = await this.sources.find({ id });
if (!source) throw new ApplicationException({ kind: NOT_FOUND, ... });

// ✓ get을 사용한다 — NOT_FOUND를 자동으로 throw한다
const source = await this.sources.get({ id });
```

## Repository vs Query Port

### Read-for-write vs Read-for-display

여러 결과를 반환하는 모든 읽기 연산은 두 범주 중 하나에 속한다:

| 범주 | 정의 | 구현 위치 |
|---|---|---|
| **Read-for-write** | Domain method를 호출하거나 쓰기 전 전제 조건을 검증하기 위해 aggregate를 로드한다 | Repository (`list`) |
| **Read-for-display** | Domain behavior를 호출하지 않고 caller에게 데이터를 표시하기 위해 가져온다 | Application Query port (`paginate`, `search`) |

`repository.list()`는 caller가 full aggregate object가 필요할 때 사용한다:
- Domain method를 호출하기 위해 (`post.incrementViewCount()`, `source.syncContentSnapshot(...)`)
- 상태 변경 전 domain invariant를 확인하기 위해

`query.paginate()` / `query.search()`는 caller가 화면 표시용으로만 flat 데이터가 필요할 때 사용한다:
- Cursor가 있는 페이지네이션 목록
- 여러 aggregate의 field를 조합한 read model
- Use case가 반환된 객체에 domain method를 호출하지 않는 모든 조회

### JOIN 정책

| 레이어 | 허용되는 JOIN |
|---|---|
| **Repository** | Aggregate 내부 JOIN만 허용한다. Repository JOIN은 단일 aggregate를 테이블에서 재구성한다(root + child entity + embedded value object). Aggregate 경계를 넘어 다른 aggregate 또는 context의 데이터를 가져오는 JOIN은 해서는 안 된다. |
| **Query Port** | Aggregate 간, context 간 JOIN을 허용한다. Query port 구현체는 read-model projection을 구성하는 데 필요한 모든 테이블을 JOIN할 수 있다. 이것이 repository 읽기 대비 Query port의 핵심 장점이다. |

### Query port 표준 메서드 이름

| 메서드 | 의미 |
|---|---|
| `get` | 하나를 반환하며, 없으면 throw한다 |
| `find` | 하나를 반환하거나 없으면 `null`을 반환한다 |
| `paginate` | 다음 페이지를 위한 cursor와 함께 항목 페이지를 반환한다 |
| `search` | query string에 매칭되는 항목을 관련도 순으로 반환한다 |
| `count` | 조건에 맞는 항목 수를 반환한다 |
| `exists` | 조건에 맞는 항목이 하나라도 있으면 `true`, 없으면 `false`를 반환한다 |

실제로 필요한 메서드만 정의한다. 미래를 위해 추측으로 메서드를 추가하지 않는다.
