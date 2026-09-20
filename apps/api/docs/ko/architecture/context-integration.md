---
title: API 컨텍스트 통합 컨벤션
applies_to:
  - apps/api
related:
  - ./ddd.md
  - ./source-dependency.md
  - ./runtime-wiring.md
---

# API 컨텍스트 통합 컨벤션

이 문서는 바운디드 컨텍스트 경계를 넘어 데이터나 동작을 통합할 때 따를 규칙을 정의한다.

## 적용 범위

- 컨텍스트 A가 컨텍스트 B 소유의 데이터나 동작을 필요로 할 때 이 문서를 사용한다.
- 모델 소유권과 경계 결정은 [DDD 컨벤션](./ddd.md)을 사용한다.
- import 방향과 레이어 경계 규칙은 [source dependency 컨벤션](./source-dependency.md)을 사용한다.
- provider 등록과 모듈 배선 규칙은 [runtime wiring 컨벤션](./runtime-wiring.md)을 사용한다.

## 이벤트 분류와 전달

### 도메인 이벤트

- Domain event는 소유 bounded context 안에서 aggregate가 만든 비즈니스 사실을 기록한다.
  - Aggregate가 domain event를 기록하고 application orchestration이 수집한다.
  - Domain event 클래스를 컨텍스트 사이의 계약으로 직접 노출하지 않는다.

### 통합 이벤트

- Integration event는 bounded context 경계를 넘어 사실을 전달하는 버전이 있는 application layer 계약이다.
  - Integration event는 전송 기술과 무관한 `eventId`, `eventType`, `eventVersion`, `occurredAt`, `payload`와
    원시 데이터 형태의 payload를 가진다.
  - Aggregate, entity, value object, repository 또는 전송 기술 객체를 노출해서는 안 된다.
- Producer의 각 integration event는 application kernel의 `IntegrationEvent` 기반 클래스를 확장하는 구체
  클래스로 정의한다.
  - 이벤트별 생성 규칙과 payload 조립을 한곳에 두기 위해 `new <Fact>IntegrationEvent(...)`로 생성한다.
  - `eventType`과 `eventVersion`은 구체 클래스에 `readonly` 리터럴 속성으로 직접 선언한다.
  - 구체 integration event의 식별 속성을 초기화하기 위한 용도로만 모듈 상수를 만들지 않는다.
  - Domain event와 integration event의 기반 클래스 형태는 유사할 수 있지만 소유권과 호환성 규칙이
    다르므로 서로 상속하지 않는다.
- Aggregate에서 발생한 사실을 전달할 때는 domain event를 integration event로 변환한다.
  - Aggregate 상태 변경이 아니라 application workflow에서 발생한 사실이라면 application orchestration이
    integration event를 직접 만들 수 있다.
- 수신한 integration event는 신뢰할 수 없는 경계 입력으로 취급한다.
  - Presentation consumer가 type, version, metadata, payload를 검증한 후 application 동작을 호출한다.
  - 직렬화 이후에는 구조만 유지되고 클래스 정체성은 유지되지 않으므로 producer의 구체 클래스나
    `instanceof`에 의존해서는 안 된다.
  - Schema, decorator 또는 routing table에서 같은 리터럴을 여러 번 사용한다면 consumer 소유의 지역
    상수를 둘 수 있다. 컨텍스트 경계를 넘어 producer의 상수를 import하지 않는다.

### 이벤트 종류 결정

- 이벤트 종류는 전달 채널과 독립적으로 소유권 경계를 기준으로 결정한다.
  - 하나의 bounded context가 소유하고 그 안에서 소비하는 비즈니스 사실에는 domain event를 사용한다.
  - 두 컨텍스트가 같은 application process에서 실행되더라도 bounded context 경계를 넘는 사실에는
    integration event를 사용한다.
  - 비동기로 전달하거나 영속화한다는 이유만으로 domain event를 integration event로 바꾸지 않는다.
- 다음 동작이 현재 유스 케이스를 완료하는 데 반드시 필요하면 명시적인 호출을 우선한다.
  - 시작 동작과 의미 있게 분리할 수 있는 반응에 이벤트를 사용한다.
  - 필수 orchestration과 event reaction의 구분은 framework 선택이 아니라 비즈니스 책임에 관한 결정이다.

### 전달 채널 결정

- 이벤트 종류를 결정한 뒤 전달 채널을 선택한다.
  - Producer와 consumer가 같은 process에 있고 내구성이 필요 없는 로컬 전달이면 in-process dispatcher가
    적합하다.
  - Process 경계를 넘는 전달에는 message broker 또는 다른 remote transport가 적합하다.
  - Process 배치는 dispatcher 또는 transport 구현을 바꿀 뿐 domain event와 integration event의 종류를
    바꾸지 않는다.
- Outbox 뒤에는 in-process dispatcher와 message broker 중 어느 것이든 올 수 있다.
  - Outbox relay는 저장된 integration event를 읽어 설정된 `IntegrationEventDispatcher`에 넘긴다.
  - Local event-emitter dispatcher와 broker dispatcher는 그 다음 전달 경계의 대체 구현이다.
  - 설정된 dispatcher가 event를 성공적으로 받아들인 뒤에만 outbox record를 published로 표시한다.

### Outbox 전달

- Outbox는 integration event를 유실 없이 전달하는 메커니즘이며 별도의 이벤트 종류가 아니다.
  - Outbox에 저장하고 relay하더라도 컨텍스트 간 계약의 이름은 `IntegrationEvent`로 정한다.
  - 저장과 relay 메커니즘을 구현하는 컴포넌트에는 `OutboxWriter`, `OutboxRelayStore`, `OutboxRelay` 이름을
    유지한다.
- Integration event가 DB 변경의 커밋 사실을 나타내고 신뢰성 있는 전달이 필요하다면, 해당 변경을
  커밋하는 트랜잭션에서 integration event를 outbox에 저장한다.
- Outbox 사용 여부는 같은 process인지가 아니라 내구성과 원자성 요구를 기준으로 결정한다.
  - 커밋된 DB 변경이 반드시 언젠가 실행되어야 하는 후속 반응을 뜻하고, event 유실을 허용할 수 없으며,
    process 재시작 뒤 재시도가 필요하면 outbox를 사용한다.
  - 같은 process로 전달하는 integration event도 이러한 보장이 필요하면 outbox를 사용할 수 있다.
  - DB 변경과 원자적으로 커밋할 대상이 없고 내구성 있는 handoff도 필요하지 않다면 process 경계를 넘는
    integration event라고 해서 자동으로 outbox가 필요한 것은 아니다.
  - 유실을 명시적으로 허용하는 best-effort 로컬 알림이나 반응에는 outbox를 추가하지 않는다.
- 직접적인 in-process dispatch와 outbox 전달은 보장 범위가 다르다.
  - Event emitter는 integration event를 로컬에서 전달할 수 있지만 이벤트를 영속화하지 않는다.
  - 로컬 integration event를 outbox로 옮기는 것은 이벤트 종류가 아니라 전달 정책의 변경이다.

## 통합 전략

### 기본 전략: Pull (컨슈머 소유 포트와 어댑터)

컨텍스트 A(컨슈머)가 컨텍스트 B(프로듀서) 소유의 데이터를 필요로 할 때, 기본 전략은 Pull이다. A가 정의하고 소유하는 포트를 통해 요청 시점에 B에서 데이터를 조회한다.

**Pull을 사용하는 경우:**

- 두 컨텍스트가 같은 프로세스와 같은 DB 안에서 실행될 때.
- 두 컨텍스트 간에 실제로 확인된 가용성 또는 지연 문제가 없을 때.

**Push(Read Model)로 전환하는 경우:**

- 프로듀서 장애나 지연이 실제로 컨슈머 응답을 자주 저하시키는 것이 확인된 경우.
- 두 컨텍스트가 별도 프로세스나 DB로 분리되는 경우.

핵심 트레이드오프: Pull은 항상 최신 데이터를 제공하지만 시간적 결합(temporal coupling)이 생긴다 — 두 컨텍스트가 같은 순간에 모두 살아있어야 한다.
Push는 그 결합을 없애는 대신 최종적 일관성(eventual consistency)과 이벤트 인프라, 프로젝션 로직, 데이터 불일치 관리라는 복잡도를 추가한다.
둘 다 결합 자체를 없애주는 게 아니라 가용성과 일관성 사이에서 결합의 위치를 옮길 뿐이다.

### 왜 공통 모듈이 아닌가

포트 계약을 공통(shared/common) 모듈에 두면 안 된다. `common`이 인터페이스를 소유하면 A와 B 모두 `common`에 의존하게 되어, 제3의 모듈을 통해 두 컨텍스트가 묶이는 숨은 허브가 생긴다.
또한 인터페이스가 미래의 가상 소비자를 위해 넓어지는 경향이 있어 인터페이스 분리 원칙(Interface Segregation)을 위반한다.

컨슈머 소유 계약은 A가 실제로 필요한 것만 담기 때문에 좁고 명확하게 유지된다.

### 네이밍 어휘

- **양쪽 포트 모두 `<Concept>Lookup`으로 이름 짓는다** (데이터 조회가 아니라 동작인 경우엔 평범한 동작 동사, 예: `Embedder`, `SearchQueryEmbedder`) — 빌려온 OOP 패턴 단어(`Service`, `Gateway`, `Facade` 등)가 아니라, 그 컨텍스트 자신의 도메인 언어로 "제공하는 기능"을 그대로 이름 짓는다.
  - 프로듀서 자신의 포트와 컨슈머 자신의 포트가 억지로 다른 단어를 쓸 필요는 없다. ACL의 폴더 위치(`contexts/A/acl/<B-name>/`)가 이미 "이건 컨텍스트 경계를 넘는다"는 걸 말해주고 있어서, 포트 이름이 그걸 또 말할 필요가 없다.
  - 토큰: `<CONCEPT>_LOOKUP`.
- **양쪽이 같은 실제 개념을 가리키면 이름이 우연히 똑같아질 수 있다** (예: ingestion 자신의 포트와 library 자신의 포트가 각자 자기 언어로 지었는데 둘 다 `SourceEmbeddingLookup`이 되는 경우). 이럴 땐 어느 한쪽 포트 이름을 억지로 바꾸는 대신, 양쪽을 동시에 보는 파일(ACL 어댑터, 그리고 컨슈머의 모듈 배선 팩토리) 딱 그 지점에서만 프로듀서 쪽 import에 alias를 붙인다:

```ts
import { type SourceEmbeddingLookup as IngestionSourceEmbeddingLookup } from '@contexts/ingestion';
import { type SourceEmbeddingLookup } from '@contexts/library/application/ports';

export class SourceEmbeddingFromIngestionLookup implements SourceEmbeddingLookup {
  constructor(
    private readonly ingestionLookup: IngestionSourceEmbeddingLookup,
  ) {}
  // ...
}
```

- **어댑터 이름**: `<Concept>From<B-name>Lookup` (예: `SourceEmbeddingFromIngestionLookup`). 크로스 컨텍스트임을 실제로 표시하는 건 `From<B-name>` 부분이다 — Rule 2 참고.
- **프로듀서 쪽 구현체 이름에는 고정된 템플릿은 없지만, 파일은 infrastructure 어댑터와 똑같은 세 자리** — `{domain}.{무엇과-협력하는지}.{role}.ts` — **를 채운다.** `infrastructure/`가 아니라 `application/services/`에 있어도 마찬가지다. 기술 의존성이 없어서 그 위치에 있을 뿐이다.
  - Infrastructure 어댑터는 _기술_(`ollama-http`, `pg-drizzle`)로 갈린다. 프로듀서 소유 포트의 Application 계층 구현체는 갈릴 기술이 없으니, 대신 *협력 대상*으로 갈린다 — 답을 만들어내기 위해 어떤 Application/Domain 소유 의존성을 조합하는지.
  - 지금 구현체들은 B 자신의 repository 말고는 아무것과도 협력하지 않으므로, 가운데 자리는 `from-repository`이고 role 자리는 포트 자신의 role(`lookup`)과 맞춘다: `source-embedding.from-repository.lookup.ts` → `SourceEmbeddingFromRepositoryLookup implements SourceEmbeddingLookup`.
  - 이게 유일하게 허용된 협력 대상은 아니다. 나중에 어떤 구현체가 캐시를 추가하거나 두 번째 의존성을 조합하게 되면, `from-repository`에 억지로 끼워 맞추거나 이름에 접미사를 계속 이어붙이지 말고 그 구현체가 실제로 협력하는 대상으로 새로 이름 짓는다 (예: projection 기반 구현체라면 `source-embedding.from-projection.lookup.ts`). 같은 포트의 여러 구현체는 각자 독립적으로 이름 짓는다 — 전부에 적용되는 단일 가운데 자리 규칙은 없다.
  - `Impl`만 붙이는 접미사는 절대 쓰지 않는다 — 그 클래스가 "어떻게" 동작하는지 아무것도 말해주지 않는다.
- **반환 타입은 실제로 뭘 담고 있는지로 구체적으로 이름 짓는다** — `Info`, `Details`, `Data`나 포트 자신의 이름을 그대로 쓰는 것처럼 `Data`랑 다를 바 없는 일반적인 접미사 템플릿은 쓰지 않는다.
  - 예: ingestion 자신의 개념은 `EmbeddingMetadata`(모델, 차원, 타임스탬프 — 임베딩 벡터가 아니라 임베딩에 대한 메타데이터). library가 자기 언어로 갖는 사본은 `SourceEmbeddingMetadata`(이 source가 가진 임베딩 메타데이터).
  - 계약이 모양까지 달라지기도 한다. ingestion의 `Embedder`는 `{ embedding, model }`을 반환하고 실패하면 예외를 던진다. library의 `SearchQueryEmbedder`는 `number[] | null`을 반환한다 — 검색은 임베딩이 없어도 FTS만으로 성립하므로, 컨슈머 언어에서는 임베딩 실패가 오류가 아니라 "벡터 후보 없음"이다. 이 번역이 ACL이 하는 일이다.
  - 프로듀서와 컨슈머의 모양이 지금은 우연히 똑같아도 두 반환 타입 이름은 구분해서 유지한다 — 나중에 각자 독립적으로 바뀔 수 있어야 한다. 포트 이름과 달리 여기는 import alias에 기대지 않는다 — 이 타입들은 그 한 곳의 접점 파일뿐 아니라 각자 자기 쪽 애플리케이션 코드 전체에서 쓰이기 때문이다.

## 구현 규칙

### Rule 1 — 포트는 컨슈머가 소유한다

- 위치: `contexts/A/application/ports/`
- 파일 명명은 `{domain}.{role}.ts` 패턴을 따른다 (예: `source-embedding.lookup.ts`).
- A의 도메인 언어로 이름을 짓는다. B의 이름을 그대로 쓰지 않는다. (`SourceVectorRepository` ✗ → `SourceEmbeddingLookup` ✓)
- A가 실제로 필요한 메서드만 포함한다.
- A 자신의 일반 데이터 타입을 반환한다. B의 애그리거트나 값 객체를 노출하지 않는다.

### Rule 2 — 어댑터는 컨슈머의 ACL에 둔다

- 위치: `contexts/A/acl/<B-name>/` (`<B-name>`은 프로듀서 컨텍스트 이름). ACL은 `infrastructure/`와 분리된 전용 레이어다 — 바운디드 컨텍스트 경계를 넘는 것은 구체적인 기술에 접근하는 것과는 다른 종류의 외부 의존이기 때문이다. 자세한 건 [source dependency 컨벤션](./source-dependency.md#source-area)을 참고한다.
- 파일과 클래스 명명은 infrastructure 어댑터와 똑같은 세 자리 형태([infrastructure adapter 컨벤션](./infrastructure.md))인 `{domain-name}.{adapter-or-purpose}.{role}.ts`를 그대로 재사용한다.
  - 크로스 컨텍스트 Pull 어댑터는 `adapter-or-purpose` 자리에 `from-<B-name>`을 쓴다 (예: `source-embedding.from-ingestion.lookup.ts` → `SourceEmbeddingFromIngestionLookup`).
  - `from-` 접두사를 붙이면 폴더 경로를 보지 않아도 파일명만으로 크로스 컨텍스트 어댑터임을 알 수 있다.
  - 도메인 이름과 프로듀서 컨텍스트 이름이 어휘적으로 비슷할 때도 어느 쪽이 컨텍스트 이름인지 분명해진다.
- A의 모듈 배선 코드를 제외하면, A에서 B를 import할 수 있는 파일은 이 어댑터뿐이다.
  - A의 모듈 배선 코드와 이 어댑터는 B의 공개 표면인 `contexts/B/index.ts`만 (bare alias `@contexts/B`로) import할 수 있다.
  - B의 루트 레벨 파일인 `B.di-tokens.ts`와 `B.module.ts`는 B의 내부 배선 파일이다. `domain/`, `infrastructure/`, `presentation/`, `acl/` 밖에 있어도 다른 컨텍스트가 이 파일들을 직접 import해서는 안 된다.
- 어댑터는 B의 Application 계층 포트에 바인딩한다. B의 Domain 계층 Repository나 그 밖의 도메인 소유 계약에는 절대 바인딩하지 않는다.
  - Domain 계층 계약은 B 자신의 유스 케이스를 위해 존재한다. B 자신의 `B.di-tokens.ts`가 (예: `forFeature()`를 `forRoot()`에 연결하기 위해) 이 계약을 여전히 재수출할 수는 있지만, 그 재수출이 다른 컨텍스트도 바인딩해도 된다는 뜻은 아니다 — 그리고 이건 `contexts/B/index.ts`까지 도달해서는 안 된다.
  - A의 필요에 맞는 Application 계층 포트가 B에 없다면, B가 Domain 계층 계약을 감싸는 포트를 새로 추가한다. A가 그걸 건너뛰고 직접 닿게 하지 않는다.
- B의 도메인 객체는 이 어댑터 파일 밖에서는 나타나지 않는다.

### Rule 3 — DI 토큰은 컨슈머가 소유한다

- `contexts/A/a.di-tokens.ts`에 선언한다.
- B의 DI 토큰은 A의 모듈 배선 팩토리 안에서만 참조한다. A의 도메인이나 애플리케이션 코드에서는 참조하지 않는다.
- B는 자기 토큰과 타입 중 어떤 걸 다른 컨텍스트에 노출해도 안전한지 `contexts/B/index.ts`를 직접 큐레이션해서 결정한다.
  - Application 계층 포트와 그걸 해석하는 DI 토큰만 `index.ts`에 들어간다.
  - `B.di-tokens.ts`가 B 자신을 위해 재수출한 것이라도, Domain 계층 계약은 `index.ts`에 절대 들어가지 않는다.

### Rule 4 — 크로스 컨텍스트 조회는 유스 케이스가 담당한다 (컨트롤러가 아닌)

- 컨트롤러는 HTTP ↔ 유스 케이스 매핑만 한다. 여러 출처의 데이터를 직접 조합하지 않는다.
- 유스 케이스가 포트를 주입받아 응답에 필요한 모든 데이터를 조율한다.

### Rule 5 — 배선은 컨슈머의 모듈에서 한다

- `AModule.forRoot()`가 어댑터 provider를 선언하고 팩토리에서 B가 `contexts/B/index.ts`로 공개한 토큰을 주입한다.
- A의 모듈 팩토리 안에서 B의 DI 토큰을 주입하는 것은 허용된다 — 이것은 ACL 배선이지 도메인 결합이 아니다.

## 읽기 모델의 크로스 컨텍스트 SQL 예외

- 읽기 전용 쿼리 어댑터는 다른 컨텍스트가 소유한 테이블을 SQL에서 직접 읽을 수 있다. 쓰기는 어떤 경우에도 허용하지 않는다.
- 이 예외는 하나의 쿼리 안에서 랭킹이나 집계를 계산해야 하고, 그 계산을 포트 경계 너머로 나눌 수 없을 때만 쓴다.
  - 지금 이 예외에 해당하는 것은 `library`의 포스트 검색 하나다. FTS 점수와 임베딩 거리를 RRF로 합치려면 두 값이 같은 쿼리 안에 있어야 하므로, `ingestion`이 소유한 `source_embeddings`를 직접 조인한다.
  - 포트로 분리하면 후보를 애플리케이션 메모리로 가져와 재랭킹해야 하고, 그 순간 랭킹 품질과 페이지네이션이 모두 깨진다.
- 단순 조회, 존재 확인, 화면 조립처럼 한 쿼리일 필요가 없는 경우에는 이 예외를 쓰지 않는다. Rule 1과 Rule 2를 따라 컨슈머 소유 포트와 ACL을 만든다.
- 이 예외는 정적 검사가 잡지 못한다. SQL은 문자열이라 dependency-cruiser도 타입 체커도 테이블 참조를 보지 못한다.
  - 그래서 프로듀서 쪽 테이블이나 컬럼을 바꿀 때 이 쿼리가 깨진다. 스키마를 바꾸는 변경 단위에서 이 예외 목록을 함께 확인한다.
  - 예외를 늘릴 때는 위 조건(한 쿼리에서 계산되어야 함)을 실제로 만족하는지 확인하고, 이 절에 어느 쿼리인지 적는다.

## 검토 체크리스트

- 크로스 컨텍스트 포트가 공통 모듈이나 프로듀서가 아닌 컨슈머 소유인지 확인한다.
- B로부터의 import가 어댑터와 A의 모듈 배선에 필요한 B의 `index.ts` 공개 표면으로 제한되는지 확인한다 — `B.di-tokens.ts`나 `B.module.ts`를 직접 import하지 않는지.
- 어댑터가 프로듀서의 Domain 계층 Repository나 그 밖의 도메인 소유 계약이 아닌, 프로듀서의 Application 계층 포트에 바인딩하는지 확인한다.
- 프로듀서의 `index.ts`가 Application 계층 포트와 그 토큰만 재수출하는지, Domain 계층 계약은 없는지 확인한다.
- 포트가 B의 애그리거트나 값 객체가 아닌 A 자신의 타입을 반환하는지 확인한다.
- 크로스 컨텍스트 데이터 조합이 컨트롤러가 아닌 유스 케이스에서 이루어지는지 확인한다.
- Pull 전략이 여전히 맞는 선택인지, 또는 실제로 확인된 가용성/지연 문제로 Read Model 전환이 정당화되는지 확인한다.
- 크로스 컨텍스트 SQL이 있다면 읽기 전용인지, 그리고 한 쿼리에서 계산되어야 하는 이유가 있는지 확인한다.
