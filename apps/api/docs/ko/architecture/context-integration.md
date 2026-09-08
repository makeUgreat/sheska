---
title: API 컨텍스트 통합 컨벤션
lang: ko
audience: both
applies_to:
  - apps/api
source: ../../en/architecture/context-integration.md
last_synced: 2026-09-08
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
- **양쪽이 같은 실제 개념을 가리키면 이름이 우연히 똑같아질 수 있다** (예: ingestion 자신의 포트와 sources 자신의 포트가 각자 자기 언어로 지었는데 둘 다 `SourceEmbeddingLookup`이 되는 경우). 이럴 땐 어느 한쪽 포트 이름을 억지로 바꾸는 대신, 양쪽을 동시에 보는 파일(ACL 어댑터, 그리고 컨슈머의 모듈 배선 팩토리) 딱 그 지점에서만 프로듀서 쪽 import에 alias를 붙인다:

```ts
import { type SourceEmbeddingLookup as IngestionSourceEmbeddingLookup } from '@contexts/ingestion';
import { type SourceEmbeddingLookup } from '@contexts/sources/application/ports';

export class SourceEmbeddingFromIngestionLookup implements SourceEmbeddingLookup {
  constructor(private readonly ingestionLookup: IngestionSourceEmbeddingLookup) {}
  // ...
}
```

- **어댑터 이름**: `<Concept>From<B-name>Lookup` (예: `SourceEmbeddingFromIngestionLookup`). 크로스 컨텍스트임을 실제로 표시하는 건 `From<B-name>` 부분이다 — Rule 2 참고.
- **프로듀서 쪽 구현체 이름에는 고정된 템플릿은 없지만, 파일은 infrastructure 어댑터와 똑같은 세 자리** — `{domain}.{무엇과-협력하는지}.{role}.ts` — **를 채운다.** `infrastructure/`가 아니라 `application/services/`에 있어도 마찬가지다. 기술 의존성이 없어서 그 위치에 있을 뿐이다.
  - Infrastructure 어댑터는 *기술*(`ollama-http`, `pg-drizzle`)로 갈린다. 프로듀서 소유 포트의 Application 계층 구현체는 갈릴 기술이 없으니, 대신 *협력 대상*으로 갈린다 — 답을 만들어내기 위해 어떤 Application/Domain 소유 의존성을 조합하는지.
  - 지금 구현체들은 B 자신의 repository 말고는 아무것과도 협력하지 않으므로, 가운데 자리는 `from-repository`이고 role 자리는 포트 자신의 role(`lookup`)과 맞춘다: `source-embedding.from-repository.lookup.ts` → `SourceEmbeddingFromRepositoryLookup implements SourceEmbeddingLookup`.
  - 이게 유일하게 허용된 협력 대상은 아니다. 나중에 어떤 구현체가 캐시를 추가하거나 두 번째 의존성을 조합하게 되면, `from-repository`에 억지로 끼워 맞추거나 이름에 접미사를 계속 이어붙이지 말고 그 구현체가 실제로 협력하는 대상으로 새로 이름 짓는다 (예: projection 기반 구현체라면 `source-embedding.from-projection.lookup.ts`). 같은 포트의 여러 구현체는 각자 독립적으로 이름 짓는다 — 전부에 적용되는 단일 가운데 자리 규칙은 없다.
  - `Impl`만 붙이는 접미사는 절대 쓰지 않는다 — 그 클래스가 "어떻게" 동작하는지 아무것도 말해주지 않는다.
- **반환 타입은 실제로 뭘 담고 있는지로 구체적으로 이름 짓는다** — `Info`, `Details`, `Data`나 포트 자신의 이름을 그대로 쓰는 것처럼 `Data`랑 다를 바 없는 일반적인 접미사 템플릿은 쓰지 않는다.
  - 예: ingestion 자신의 개념은 `EmbeddingMetadata`(모델, 차원, 타임스탬프 — 임베딩 벡터가 아니라 임베딩에 대한 메타데이터). sources가 자기 언어로 갖는 사본은 `SourceEmbeddingMetadata`(이 source가 가진 임베딩 메타데이터). sources 자신의 콘텐츠 개념은 `SourceDocument`. posts가 자기 언어로 갖는 사본은 `PublishableSourceContent`(posts가 포스트를 만들 때 쓰는 콘텐츠).
  - 프로듀서와 컨슈머의 모양이 지금은 우연히 똑같아도 두 반환 타입 이름은 구분해서 유지한다 — 나중에 각자 독립적으로 바뀔 수 있어야 한다. 포트 이름과 달리 여기는 import alias에 기대지 않는다 — 이 타입들은 그 한 곳의 접점 파일뿐 아니라 각자 자기 쪽 애플리케이션 코드 전체에서 쓰이기 때문이다.

## 구현 규칙

### Rule 1 — 포트는 컨슈머가 소유한다

- 위치: `contexts/A/application/ports/`
- 파일 명명은 `{domain}.{role}.ts` 패턴을 따른다 (예: `source-embedding.lookup.ts`).
- A의 도메인 언어로 이름을 짓는다. B의 이름을 그대로 쓰지 않는다. (`SourceVectorRepository` ✗ → `SourceEmbeddingLookup` ✓)
- A가 실제로 필요한 메서드만 포함한다.
- A 자신의 일반 데이터 타입을 반환한다. B의 애그리거트나 값 객체를 노출하지 않는다.

### Rule 2 — 어댑터는 컨슈머의 ACL에 둔다

- 위치: `contexts/A/acl/<B-name>/` (`<B-name>`은 프로듀서 컨텍스트 이름). ACL은 `infrastructure/`와 분리된 전용 레이어다 — 바운디드 컨텍스트 경계를 넘는 것은 구체적인 기술에 접근하는 것과는 다른 종류의 외부 의존이기 때문이다. 자세한 건 [source dependency 컨벤션](./source-dependency.md#anti-corruption-layer-acl)을 참고한다.
- 파일과 클래스 명명은 infrastructure 어댑터와 똑같은 세 자리 형태([infrastructure adapter 컨벤션](./infrastructure.md))인 `{domain-name}.{adapter-or-purpose}.{role}.ts`를 그대로 재사용한다.
  - 크로스 컨텍스트 Pull 어댑터는 `adapter-or-purpose` 자리에 `from-<B-name>`을 쓴다 (예: `source-embedding.from-ingestion.lookup.ts` → `SourceEmbeddingFromIngestionLookup`).
  - `from-` 접두사를 붙이면 폴더 경로를 보지 않아도 파일명만으로 크로스 컨텍스트 어댑터임을 알 수 있다.
  - 도메인 이름과 프로듀서 컨텍스트 이름이 어휘적으로 비슷할 때도 모호함을 피할 수 있다 (예: `source` vs `sources`).
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

## 검토 체크리스트

- 크로스 컨텍스트 포트가 공통 모듈이나 프로듀서가 아닌 컨슈머 소유인지 확인한다.
- B로부터의 import가 어댑터와 A의 모듈 배선에 필요한 B의 `index.ts` 공개 표면으로 제한되는지 확인한다 — `B.di-tokens.ts`나 `B.module.ts`를 직접 import하지 않는지.
- 어댑터가 프로듀서의 Domain 계층 Repository나 그 밖의 도메인 소유 계약이 아닌, 프로듀서의 Application 계층 포트에 바인딩하는지 확인한다.
- 프로듀서의 `index.ts`가 Application 계층 포트와 그 토큰만 재수출하는지, Domain 계층 계약은 없는지 확인한다.
- 포트가 B의 애그리거트나 값 객체가 아닌 A 자신의 타입을 반환하는지 확인한다.
- 크로스 컨텍스트 데이터 조합이 컨트롤러가 아닌 유스 케이스에서 이루어지는지 확인한다.
- Pull 전략이 여전히 맞는 선택인지, 또는 실제로 확인된 가용성/지연 문제로 Read Model 전환이 정당화되는지 확인한다.
