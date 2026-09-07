---
title: API 테스트 컨벤션
lang: ko
audience: both
applies_to:
  - apps/api
source: ../en/test.md
last_synced: 2026-09-07
read_when:
  - API 테스트 종류, 위치, case 구조, test double, fixture, 명령을 선택할 때.
related:
  - ./architecture/source-dependency.md
  - ./persistence/persistence.md
  - ./operability/error.md
---

# API 테스트 컨벤션

## 적용 범위

- API 앱은 Vitest를 사용하며 단위 테스트와 통합 테스트를 분리한다.
- 동작을 신뢰성 있게 증명할 수 있는 가장 저렴한 테스트 계층을 사용한다.
  - 하나의 unit이 소유한 동작을 통제된 collaborator로 검증할 때는 단위 테스트를 사용한다.
  - 조립된 boundary가 필요한 관찰 가능한 동작에는 통합 테스트를 사용한다.
- 테스트 import 경계는 [source dependency 컨벤션](./architecture/source-dependency.md)을 따른다.

## 테스트 도구

- API 테스트는 반드시 Vitest를 사용한다.
- Named `test.projects`를 사용하는 `apps/api/vitest.config.ts`에 설정을 모아둔다.
- 포함 규칙, setup, timeout, runtime dependency가 별도로 필요한 boundary는 named project로 추가한다.
- 설정된 파일 이름 패턴을 따른다.
  - 단위 테스트: `src/**/*.spec.ts`.
  - 통합 테스트: `test/**/*.integration-spec.ts` 또는 `test/**/*.e2e-spec.ts`.

## 테스트 케이스 설계

- 바깥 `describe()`는 테스트 대상의 이름으로 작성한다.
- `it()` 이름은 한글 중심으로 작성한다.
  - Route, code identifier, technical term은 더 명확할 때 원문 언어를 유지한다.
- 각 `it()`는 하나의 동작을 실행하고 하나의 결과를 검증하는 것이 좋다.
  - 같은 응답을 설명하는 status, body, header 검증은 함께 둔다.
  - 실행 경로나 기대 결과가 다르면 case를 나눈다.
- Private helper 호출 순서가 아니라 관찰 가능한 결과와 collaborator interaction을 검증한다.
- 테스트는 결정적이어야 하며 다른 테스트가 남긴 상태에 의존해서는 안 된다.
  - 가장 좁고 적합한 lifecycle hook으로 격리된 상태를 만들고 정리한다.

## Test Double

- `vi.fn()`, `vi.spyOn()` 같은 Vitest helper로 test double을 만들고 검증해도 된다.
- 반환값 설정, 호출 검증, 단순 오류 주입에는 mock을 우선 사용한다.
- 여러 메서드가 공유하는 의미 있는 상태나 동작이 필요하면 직접 작성한 fake 또는 stub을 사용한다.
- Test double은 기본적으로 해당 spec 안에 둔다.
  - 여러 spec이 같은 동작을 필요로 할 때만 공용 factory를 추출한다.
- 통합 테스트에서는 검증 boundary 바깥의 collaborator만 대체한다.
  - 테스트가 증명하려는 adapter, framework wiring, runtime dependency는 실제 구현을 사용한다.

## Fixture와 Helper

- 재사용이나 반복되는 setup 때문에 필요하지 않다면 fixture와 helper를 해당 spec 안에 둔다.
- Side effect에 따라 helper 이름을 정한다.
  - `buildX`: 외부 I/O 없이 메모리의 값, 도메인 객체, DTO, row, double을 만든다.
  - `createX`: 데이터를 저장하거나 runtime resource를 시작하는 등 외부 상태를 바꾼다.
  - `setupX`: Nest app, testing module, mock group, boundary runtime을 조립한다.
- 추출한 helper는 소유권에 따라 배치한다.
  - 공용 domain fixture: `test/support/domains/fixtures/`.
  - Boundary fixture: `test/adapters/{boundary}/{context}/fixtures/`.
  - Boundary setup: `test/adapters/{boundary}/support/`.
  - 여러 integration boundary가 공유하는 helper: `test/support/`.
- Import를 줄이기 위한 목적으로만 test path alias를 추가하지 않는다.

## 단위 테스트

### 배치와 범위

- 단위 spec은 대상 source file 옆의 `__tests__`에 둔다.
  - 예: `src/contexts/sources/domain/__tests__/source-content.vo.spec.ts`.
- 단위 테스트는 HTTP server, 실제 Nest application, 외부 I/O를 시작해서는 안 된다.
- 대상을 직접 생성하고 collaborator는 가벼운 test double로 대체한다.
- DI metadata나 module 설정이 검증 대상일 때만 Nest testing module을 사용한다.

### 도메인 테스트

- 도메인 객체나 service가 소유한 동작과 invariant를 검증한다.
- Value object에서는 다음 항목을 우선한다.
  - 생성과 normalization.
  - Invariant violation과 boundary value.
  - Equality, identity, 명시적인 immutability 보장.
- Aggregate와 entity에서는 다음 항목을 우선한다.
  - 생성과 복원.
  - 상태 전이와 consistency boundary.
  - Domain event와 유효하지 않은 동작의 오류.
- DTO, persistence, API scenario가 아니라 domain language로 case를 표현한다.

### Use Case 테스트

- 입력과 port 결과를 통해 각 orchestration branch를 명확히 드러낸다.
- Application이 소유한 판단을 검증한다.
  - Command 해석과 분기.
  - Domain result 전파.
  - 필요한 persistence 또는 external port interaction.
  - Use case가 소유한 error mapping.
- 상세한 domain invariant나 adapter 저장 동작을 반복하지 않는다.

### 공용 계약 테스트

- Base class, kernel helper, 공용 policy의 재사용 보장은 소유 위치에서 한 번 검증한다.
- 최소한의 대표 implementation, fixture, subclass를 사용한다.
- 구체 implementation은 자체 validation, configuration, composition, override만 검증하는 것이 좋다.
  - Override가 공용 보장을 축소하거나 확장하면 해당 보장도 다시 검증한다.

## 통합 테스트

### 목적

- 조립된 boundary에서만 증명할 수 있는 동작에 통합 테스트를 사용한다. 예시는 다음과 같다.
  - Framework routing, request parsing, response shaping, exception filter.
  - 실제 adapter module과 application-owned port contract.
  - Database schema, constraint, ORM query, transaction, upsert.
  - Message broker, external API, 그 밖의 실제 runtime dependency.
- 제어 가능한 clock이나 in-memory filesystem을 쓴다는 이유만으로 통합 테스트가 되지는 않는다.
- 모든 domain 또는 application rule을 통합 테스트에서 반복하지 않는다.

### 배치

- Adapter 통합 spec은 `test/adapters/{boundary}/{context}/`에 둔다.
  - 현재 boundary는 `http`, `local`, `postgres`, `redis`, `ollama`다.
  - 앱 공용 platform 동작의 context에는 `platform`을 사용한다.
  - 파일 이름으로 대상을 식별하고 source layer directory를 그대로 만들지 않는다.
  - 예: `test/adapters/postgres/sources/source.repository.integration-spec.ts`.
- Tool과 정적 정책 통합 spec은 `test/static/{tool}/`에 둔다.
- 재사용하는 runtime orchestration은 `test/runtime/`에 둔다.

### Boundary 소유권

- Boundary directory는 테스트할 주된 실제 dependency를 나타낸다.
- 해당 boundary는 실제 구현을 사용하고 관련 없는 external boundary는 test double로 대체한다.
  - HTTP 테스트는 downstream collaborator를 통제하면서 routing과 response 동작을 검증한다.
  - Postgres 테스트는 실제 queue 없이 database wiring과 query 동작을 검증한다.
- 서로 다른 책임을 증명한다면 같은 entry point가 여러 boundary에 나타나도 된다.
- 부수적으로 관찰되는 결과가 아니라 boundary가 소유한 동작으로 테스트 이름을 작성한다.
- 여러 실제 dependency를 쓰는 cross-boundary smoke test는 production composition을 증명할 때만 허용한다.
  - 수를 적게 유지하고 넓은 범위를 명시하며 happy path를 우선한다.

### Adapter 검증 범위

- Adapter 코드가 소유한 동작은 단위 테스트로 검증한다.
  - External 또는 persistence shape와 domain object 사이의 mapping.
  - Domain restoration exception 보존.
  - Infrastructure error wrapping과 adapter-specific branching.
- 실제 dependency가 부과하는 동작은 통합 테스트로 검증한다.
  - Schema와 constraint 동작.
  - ORM과 protocol 호환성.
  - Transaction, upsert, connection, 실제 failure 동작.
- Adapter가 dependency error를 감쌀 때는 다음 규칙을 따른다.
  - 결과 `InfrastructureException`의 kind, code, source, `cause` shape은 단위 테스트로 검증한다.
  - Dependency의 runtime error shape가 필요한 contract일 때만 실제 failure case를 추가한다.
  - Exception 소유권은 [오류 정책](./operability/error.md)을 따른다.
- 같은 관찰 결과로 서로 다른 소유자의 책임을 증명한다면 제한적인 중복을 허용한다.

### Runtime 수명주기

- Spec에서 생성한 모든 Nest app과 application context를 초기화하고 종료한다.
- 각 case에 새 runtime이나 격리된 mutable state가 필요하면 `beforeEach`와 `afterEach`를 사용한다.
- Runtime을 안전하게 공유할 수 있고 test data가 격리된다면 `beforeAll`과 `afterAll`을 사용한다.

## 명령어

- 정적 검사:
  - `pnpm --filter @sheska/api lint:check`.
  - `pnpm --filter @sheska/api typecheck`.
- 단위 테스트:
  - `pnpm --filter @sheska/api test:unit`.
  - `pnpm --filter @sheska/api test:watch`.
  - `pnpm --filter @sheska/api test:cov`.
- 통합 테스트 project:
  - `pnpm --filter @sheska/api test:integration:local`.
  - `pnpm --filter @sheska/api test:integration:postgres`.
  - `pnpm --filter @sheska/api test:integration:redis`.
  - `pnpm --filter @sheska/api test:integration:ollama`.
- 전체 통합 테스트:
  - `pnpm --filter @sheska/api test:integration:all`.
  - `test:integration`은 `test:integration:all`의 alias다.
- 전체 API 테스트:
  - `pnpm --filter @sheska/api test`.
- 재사용 test runtime:
  - `pnpm --filter @sheska/api test:runtime:start`.
  - `pnpm --filter @sheska/api test:runtime:wait`.
  - `pnpm --filter @sheska/api test:runtime:url`.
  - `pnpm --filter @sheska/api test:runtime:stop`.
- API test runtime을 동시에 여러 개 실행하면 `SHESKA_TEST_RUNTIME_ID`를 설정한다.
  - 하나의 lifecycle에서는 모든 runtime command에 같은 ID를 사용한다.
- PR을 열기 전에 변경 범위에 해당하는 검사와 test project를 실행한다.

## 리뷰 점검

- 동작을 증명할 수 있는 가장 저렴한 계층에서 테스트하는가?
- 테스트 위치가 설정된 Vitest project와 실제 boundary에 맞는가?
- 검증 대상 바깥의 collaborator만 test double로 대체했는가?
- Fixture와 runtime resource를 격리하고 정리하는가?
- 각 case가 하나의 구체적인 동작 결과를 설명하는가?
