---
title: API 테스트 컨벤션
lang: ko
audience: both
applies_to:
  - apps/api
source: ../en/test.md
last_synced: 2026-06-30
related:
  - ./architecture.md
  - ./index.md
---

# API 테스트 컨벤션

API 앱은 Vitest를 사용하며 단위 테스트와 통합 테스트를 분리한다.
Framework routing, 실제 HTTP 응답, 실제 adapter module, 외부 dependency처럼 실제 boundary를 넘는 관찰 가능한 동작을 검증해야 할 때 통합 테스트를 작성한다.

## 적용 범위

- Test type, test file placement, test case shape, API test command를 선택할 때 이 문서를 사용한다.

## 테스트 도구

- `apps/api` 테스트는 반드시 Vitest를 사용한다.
- Vitest 설정은 named `test.projects`를 사용하는 `apps/api/vitest.config.ts`에 모아둔다.
  Vitest나 다른 도구가 별도 config file을 요구하는 경우가 아니라면 새 test boundary는 named project로 추가한다.

## 테스트 케이스 설계

- `describe()`에는 테스트 대상 이름을 사용하는 것을 선호한다.
- `it()` 테스트 케이스 이름은 팀이 동작 의도를 쉽게 검토할 수 있도록 한글 중심으로 작성해야 한다. Route, code identifier, technical term은 더 명확하다면 원문 언어를 유지할 수 있다.
- 각 `it()`는 하나의 작업 단위를 호출하고 하나의 구체적인 동작 결과를 검증해야 한다.
- 상태 코드, 본문, 헤더가 같은 실행 결과를 검증한다면 같은 `it()` 안에서 assertion한다.
- 성공, 실패, 예외, 경계값, 인증/인가, validation처럼 실행 경로나 기대 결과가 다르면 `it()` 블록을 나눈다.
- 테스트 사이에 상태 공유는 피한다. 공유 리소스가 필요하면 `beforeEach`에서 만들고 `afterEach`에서 정리한다.
- 테스트는 같은 조건에서 항상 같은 결과를 내야 한다.

## Test Double

- Test code는 test double을 만들고 검증하기 위해 `vi.fn()`, `vi.spyOn()`, mock return 설정, mock assertion 같은 Vitest helper에 의존할 수 있다.
- Dependency가 설정된 반환값, 호출 검증, 단순 error injection만 필요로 한다면 별도 stub class보다 test-library mock을 선호한다.
- Test double에 의미 있는 상태, 여러 method가 공유하는 behavior, 또는 mock function 묶음보다 읽기 쉬운 domain-specific in-memory 구현이 필요하다면 직접 작성한 fake 또는 stub class를 사용한다.
- Test double은 유용한 가장 좁은 범위에 둔다. 기본적으로 spec file 안에 정의하고, 여러 테스트가 같은 behavior를 필요로 할 때만 shared factory로 추출한다.
- 통합 테스트에서는 검증하려는 boundary 바깥의 collaborator에만 test double을 사용한다. 통합 테스트가 증명하려는 adapter, runtime dependency, framework wiring 자체는 mock으로 대체하지 않는다.
- `test/{boundary}/` 아래의 boundary-specific integration test에서는 boundary directory가 검증 대상인 실제 dependency를 나타낸다. 해당 boundary를 명시적으로 테스트하는 경우가 아니라면 관련 없는 boundary adapter는 test double로 대체한다.

## 테스트 Fixture와 Factory

- Fixture 또는 helper는 기본적으로 spec file 안에 둔다. 여러 spec이 같은 setup shape를 필요로 하거나 반복 setup이 검증하려는 동작을 가릴 때만 추출한다.
- `buildX`는 외부 I/O나 persistence side effect 없이 in-memory value, domain object, DTO, row, test double만 생성하는 순수 fixture factory에 사용한다.
- `createX`는 data를 저장하거나 runtime resource를 시작하거나 외부 상태를 바꾸는 helper에만 사용한다.
- `setupX`는 Nest application, testing module, mock group, boundary runtime 같은 test environment를 조립하는 helper에 사용한다.
- 단위 테스트와 통합 테스트가 공유하는 context-wide fixture는 `test/contexts/{context}/fixtures/` 아래에 두는 것이 좋다.
- Boundary-specific fixture는 `test/postgres/contexts/{context}/fixtures/`처럼 해당 boundary directory 아래에 두는 것이 좋다.
- 여러 integration boundary가 공유하는 helper는 `test/support/` 아래에 둔다.
- Import를 짧게 만들기 위해서만 test path alias를 추가하지 않는다. Source dependency convention에서 test-specific alias를 의도적으로 도입하기 전까지는 relative import를 사용한다.

## 테스트 계층

### 단위 테스트

- 단위 테스트는 대상 file의 directory 안에 있는 `__tests__` directory에 두는 것을 선호한다. 예: `apps/api/src/contexts/sources/domain/__tests__/source-fingerprint.vo.spec.ts`
- 순수 서비스, 함수, HTTP transport 없는 controller, 작은 비즈니스 로직 단위를 대상으로 한다.
- 대표적인 edge case, boundary value, invalid shape, error path, immutability, identity/equality behavior, 의미 있는 default behavior가 해당 unit의 contract를 정의한다면 단위 테스트에서 검증해야 한다. 이런 세부사항은 느린 통합 테스트로 미루기보다 단위 테스트 수준에서 증명하는 것을 선호한다.
- HTTP 서버, 실제 Nest 애플리케이션 startup, 외부 I/O를 사용하지 않는다.
- 필요한 dependency는 직접 만들거나 가벼운 mock/stub으로 대체한다.
- DI 설정을 검증해야 할 때만 Nest testing module을 사용한다.

#### Domain 단위 테스트

- Domain 단위 테스트는 domain object 또는 domain service가 소유한 behavior와 invariant에 집중한다.
- Value object와 domain value는 valid construction, normalization, invariant violation, boundary value, equality 또는 identity behavior를 우선적으로 검증하고, immutability는 명시적인 contract일 때만 검증한다.
- Aggregate와 entity는 lifecycle creation과 restoration, state transition, consistency boundary 보호, domain event emission, invalid domain action에 대한 thrown domain error를 우선적으로 검증한다.
- Case는 domain language로 표현한다. DTO, persistence, API scenario의 shape가 domain concept 자체가 아니라면 그 shape를 중심으로 domain test를 작성하지 않는다.

#### Use Case 단위 테스트

- Use case 단위 테스트는 use case가 조율하는 application flow가 드러나는 case로 작성하는 것을 기본으로 한다. 비즈니스 상황별로 case를 나누고, 입력과 collaborator 결과로 orchestration branch를 명확히 드러내며, private helper 호출 순서보다 최종 decision 또는 side effect를 검증한다.
- Command 해석, repository 또는 port 결과에 따른 branch, domain result 전파, 필요한 persistence 또는 external port 호출, use case가 소유한 error mapping 같은 application-level decision을 우선적으로 검증한다.
- Collaborator는 port boundary에서 mock 또는 stub으로 대체한다. Collaborator outcome을 설정해 각 orchestration branch를 명확히 만들고, 최종 result와 관찰 가능한 port interaction을 검증한다.
- 상세한 domain invariant나 adapter storage behavior를 use case 단위 테스트에서 반복하지 않는다. 그런 검증은 domain 단위 테스트나 boundary integration test에 둔다.

### 공통 계약 테스트

- Shared contract, base class, kernel helper, reusable policy는 자신이 소유한 동작을 특히 촘촘한 단위 테스트로 검증해야 한다.
- 공통 계약 테스트는 최소한의 대표 구현체, fixture, subclass를 사용해 재사용되는 보장을 한 번 증명해야 한다.
- 공통 계약에 의존하는 구체 구현체는 상속받거나 위임한 contract test를 반복하지 않는다. 자신의 validation, configuration, override, composition, domain-specific behavior만 테스트한다.
- 구체 구현체가 공통 계약 동작을 override하거나 좁히거나 확장한다면, 구현체 고유 동작과 공통 계약 기대와의 호환성을 모두 테스트한다.
- Coverage를 review할 때 동작이 shared abstraction에 속한다면 중복된 구현체 테스트를 공통 계약 테스트로 올리는 것을 선호한다.

### 통합 테스트

- Integration spec file은 boundary, context, architecture layer 기준으로 나누는 것을 선호한다. 예를 들어 HTTP controller adapter에는 `apps/api/test/http/contexts/sources/presentation/sources-http.controller.integration-spec.ts`, Postgres 기반 repository adapter에는 `apps/api/test/postgres/contexts/sources/infrastructure/persistence/source.repository.integration-spec.ts`를 사용한다.
- Routing, request/response handling, 실제 adapter contract 동작, 실제 외부 dependency 동작처럼 단위 테스트로 다룰 수 없는 상호작용을 검증할 때 통합 테스트를 사용한다.
- 실제 네트워크, REST API, 시스템 시간, 파일 시스템, 데이터베이스처럼 통제하기 어려운 요소를 사용하는 테스트는 단위 테스트가 아니라 통합 테스트로 분리한다.
- 모든 domain 또는 application invariant를 통합 테스트에서 반복하지 않는다. 상세한 domain/application rule coverage는 단위 테스트에 두고, 통합 테스트는 request/response shape, validation pipe behavior, framework routing, route 또는 port contract를 통해 관찰되는 adapter wiring, repository save/find contract 같은 observable boundary behavior에 사용한다.
- Nest app integration test file은 app을 초기화한다면 `beforeEach`에서 만들고 `afterEach`에서 닫아야 한다.
- 바깥 `describe()`는 통합 대상 이름을 지정해야 한다.
- Route test에서는 안쪽 `describe()`가 보통 controller method와 route를 나타내야 한다. 예: `describe('GET /')`.

#### Integration Boundary 배치

통합 spec은 `test/{boundary}/` 아래로 묶는다.
Boundary directory는 HTTP, Postgres, Redis, object storage, message broker, 실제 external API처럼 검증 대상인 protocol 또는 runtime dependency를 나타낸다.
한 단계 더 내려가 bounded context를 나타낸다: `test/{boundary}/{context}/`.
File name으로 target을 식별하며, source의 architecture layer를 경로에 미러링하지 않는다.
예를 들어 `test/postgres/sources/upload-source.use-case.integration-spec.ts`처럼 layer 경로를 directory에 넣지 않는 쪽을 선호한다.

`test/domains/fixtures/`는 특정 integration boundary에 속하지 않는 shared domain fixture와 helper에 사용한다.
`test/{boundary}/{context}/fixtures/`는 boundary-specific fixture에 사용한다.
Boundary-specific setup과 support file은 `test/{boundary}/support/` 아래에 둔다.
여러 integration boundary가 공유하는 helper는 `test/support/` 아래에 둔다.

#### Adapter Boundary 범위

Adapter integration test는 실제 adapter implementation과 필요한 외부 dependency를 붙인 상태에서 application이 소유한 port 또는 protocol contract를 검증해야 한다.

Adapter test coverage는 검증하려는 동작의 소유자가 어디에 있는지를 기준으로 나눈다.
단위 테스트는 adapter code 자체가 소유한 동작을 검증해야 한다. 예를 들어 external 또는 persistence shape와 domain object 사이의 mapping, domain restoration exception 보존, adapter 또는 infrastructure exception을 유용한 context로 감싸는 동작, 실제 외부 I/O 없이 증명할 수 있는 adapter-specific branching을 단위 테스트에서 다룬다.
통합 테스트는 선택된 boundary가 조립되었을 때만 의미가 있는 동작을 검증해야 한다. 예를 들어 실제 database schema와 constraint 동작, ORM query compatibility, transaction 또는 upsert 동작, 실제 adapter module을 통해 관찰되는 repository save/find contract를 통합 테스트에서 다룬다.

각 동작은 신뢰성 있게 증명할 수 있는 가장 저렴한 test layer에서 검증하는 것을 선호한다.
Adapter가 흐름에 참여한다는 이유만으로 상세한 domain, application, mapper invariant case를 통합 테스트에서 반복하지 않는다.
같은 observable result를 검증하더라도 책임이 다르면 제한적으로 중복을 허용할 수 있다. 예를 들어 단위 테스트에서 fake database로 검증한 repository exception behavior를, 통합 테스트에서는 실제 database constraint가 같은 behavior로 이어지는지 확인할 수 있다.

#### Boundary 소유권과 중복

Integration test boundary directory는 검증 대상인 primary real boundary를 정의한다.
호출하는 entry point만 보고 test scope를 결정하지 않는다.
같은 route, controller, use case, port라도 각 테스트가 서로 다른 책임을 증명한다면 둘 이상의 integration boundary에 나타날 수 있다.

Boundary-specific integration test에서는 primary boundary를 실제로 붙이고, 관련 없는 external boundary는 test double로 대체한다.
예를 들어 `test/http/` 아래의 health test는 database와 queue collaborator를 mock으로 두고 route matching, status code, response body shape, exception-filter mapping을 검증해야 한다.
`test/postgres/` 아래의 health test는 실제 database module, provider wiring, query compatibility를 검증해야 하며, queue boundary를 명시적으로 테스트하는 경우가 아니라면 queue collaborator는 mock으로 둔다.

Boundary-specific integration test의 test name은 공유 entry point나 부수적으로 관찰되는 결과가 아니라, 해당 boundary가 소유한 책임을 설명해야 한다.
예를 들어 Postgres health test가 `GET /health`를 호출하더라도 `describe()`와 `it()` 이름은 HTTP status code나 response body shape보다 실제 Postgres wiring 또는 query compatibility를 강조해야 한다.

Failure case는 그 behavior를 소유한 가장 저렴한 layer에 둔다.
Protocol error mapping과 response shape failure는 대체로 controlled test double을 사용하는 protocol boundary test에 둔다.
Real dependency failure case는 실제 dependency 없이는 신뢰성 있게 증명할 수 없을 때만 해당 dependency boundary에 둔다. 예를 들어 실제 database constraint behavior, transaction behavior, connection setup, ORM query compatibility가 이에 해당한다.

여러 real external dependency를 함께 붙이는 cross-boundary smoke test는 단일 adapter contract가 아니라 production composition을 증명할 때만 허용한다.
이런 테스트는 적게 유지하고, happy path coverage를 선호하며, 더 넓은 scope가 명확하게 드러나도록 배치하거나 이름을 정한다.

## 명령어

```bash
pnpm lint:check         # ESLint 검사
pnpm typecheck          # TypeScript type checking
pnpm test:unit          # 단위 테스트
pnpm test:integration:local # Postgres, Redis, Ollama가 필요 없는 local 통합 테스트
pnpm test:integration:postgres # Postgres 기반 통합 테스트
pnpm test:integration:redis # Redis 기반 통합 테스트
pnpm test:integration:ollama # Ollama 기반 통합 테스트
pnpm test:integration   # 모든 통합 테스트
pnpm test:integration:all # 모든 통합 테스트
pnpm test               # 단위 테스트, 그 다음 모든 통합 테스트
pnpm test:watch         # API package에서 Vitest watch 모드
pnpm test:cov           # API package에서 단위 테스트 커버리지
```

PR을 열기 전에 변경 범위에 맞는 검사를 실행한다.
고립된 서비스나 함수만 변경했다면 `pnpm lint:check`, `pnpm typecheck`, `pnpm test:unit`을 실행한다.
