---
title: API 컨텍스트 통합 컨벤션
lang: ko
audience: both
applies_to:
  - apps/api
source: ../../en/architecture/context-integration.md
last_synced: 2026-09-07
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

## 구현 규칙

### Rule 1 — 포트는 컨슈머가 소유한다

- 위치: `contexts/A/application/ports/`
- 파일 명명은 `{domain}.{role}.ts` 패턴을 따른다 (예: `source-embedding.lookup.ts`).
- A의 도메인 언어로 이름을 짓는다. B의 이름을 그대로 쓰지 않는다. (`SourceVectorRepository` ✗ → `SourceEmbeddingLookup` ✓)
- A가 실제로 필요한 메서드만 포함한다.
- A 자신의 일반 데이터 타입을 반환한다. B의 애그리거트나 값 객체를 노출하지 않는다.

### Rule 2 — 어댑터는 컨슈머의 infrastructure 레이어에 둔다

- 위치: `contexts/A/infrastructure/<B-name>/` (`<B-name>`은 프로듀서 컨텍스트 이름).
- 파일과 클래스 명명은 [infrastructure adapter 컨벤션](./infrastructure.md)의 `{domain-name}.{adapter-or-purpose}.{role}.ts` 패턴을 따른다.
  - 크로스 컨텍스트 Pull 어댑터는 `adapter-or-purpose` 자리에 `from-<B-name>`을 쓴다 (예: `source-embedding.from-ingestion.lookup.ts` → `SourceEmbeddingFromIngestionLookup`).
  - `from-` 접두사를 붙이면 폴더 경로를 보지 않아도 파일명만으로 크로스 컨텍스트 어댑터임을 알 수 있다.
  - 도메인 이름과 프로듀서 컨텍스트 이름이 어휘적으로 비슷할 때도 모호함을 피할 수 있다 (예: `source` vs `sources`).
- A의 모듈 배선 코드를 제외하면, A에서 B를 import할 수 있는 파일은 이 어댑터뿐이다.
  - A의 모듈 배선 코드는 provider 연결에 필요한 B의 공개 모듈과 DI 토큰만 import할 수 있다.
- B의 도메인 객체는 이 어댑터 파일 밖에서는 나타나지 않는다.

### Rule 3 — DI 토큰은 컨슈머가 소유한다

- `contexts/A/a.di-tokens.ts`에 선언한다.
- B의 DI 토큰은 A의 모듈 배선 팩토리 안에서만 참조한다. A의 도메인이나 애플리케이션 코드에서는 참조하지 않는다.

### Rule 4 — 크로스 컨텍스트 조회는 유스 케이스가 담당한다 (컨트롤러가 아닌)

- 컨트롤러는 HTTP ↔ 유스 케이스 매핑만 한다. 여러 출처의 데이터를 직접 조합하지 않는다.
- 유스 케이스가 포트를 주입받아 응답에 필요한 모든 데이터를 조율한다.

### Rule 5 — 배선은 컨슈머의 모듈에서 한다

- `AModule.forRoot()`가 어댑터 provider를 선언하고 팩토리에서 B가 외부에 공개한 토큰을 주입한다.
- A의 모듈 팩토리 안에서 B의 DI 토큰을 주입하는 것은 허용된다 — 이것은 infrastructure 배선이지 도메인 결합이 아니다.

## 검토 체크리스트

- 크로스 컨텍스트 포트가 공통 모듈이나 프로듀서가 아닌 컨슈머 소유인지 확인한다.
- B로부터의 import가 어댑터와 A의 모듈 배선에 필요한 공개 모듈 또는 DI 토큰으로 제한되는지 확인한다.
- 포트가 B의 애그리거트나 값 객체가 아닌 A 자신의 타입을 반환하는지 확인한다.
- 크로스 컨텍스트 데이터 조합이 컨트롤러가 아닌 유스 케이스에서 이루어지는지 확인한다.
- Pull 전략이 여전히 맞는 선택인지, 또는 실제로 확인된 가용성/지연 문제로 Read Model 전환이 정당화되는지 확인한다.
