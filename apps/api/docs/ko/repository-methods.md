---
title: Repository Method 사용 가이드
lang: ko
audience: both
applies_to:
  - apps/api
source: ../en/repository-methods.md
last_synced: 2026-07-16
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