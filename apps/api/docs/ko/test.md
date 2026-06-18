---
title: API 테스트 컨벤션
lang: ko
audience: both
applies_to:
  - apps/api
source: ../en/test.md
last_synced: 2026-06-19
related:
  - ./index.md
---

# API 테스트 컨벤션

API 앱은 Vitest를 사용하며 단위 테스트와 통합 테스트를 분리한다.
실행 속도와 검증 범위를 기준으로 단위 테스트를 먼저 선호한다.
프레임워크 설정, 모듈 연결, Nest 애플리케이션 부트스트랩, 라우팅, 실제 HTTP 응답처럼 여러 실제 컴포넌트가 함께 동작하는지 검증해야 할 때 통합 테스트를 작성한다.

## 테스트 도구

- `apps/api` 테스트는 반드시 Vitest를 사용한다.
- Vitest는 SWC로 TypeScript를 transform해서 NestJS decorator metadata를 테스트에서도 사용할 수 있게 한다.
- Test file은 `describe`, `it`, `expect`, lifecycle function을 `vitest`에서 import하는 것을 권장한다.
- 새 Jest test, Jest config file, `ts-jest`, `@types/jest`를 추가하지 않는다.
- TypeScript target, decorator, metadata 설정을 변경할 때 Vitest transform 동작과 API SWC build 설정이 어긋나지 않게 유지한다.

## 공통 리뷰 규칙

- 테스트 종류에 맞는 표준 디렉터리를 사용한다. 단위 테스트는 대상 source file 가까이에 두고, 통합 테스트는 `apps/api/test/` 아래에 둔다.
- `describe()`에는 테스트 대상 이름을 사용한다.
- 각 `it()`는 하나의 작업 단위를 호출하고 하나의 구체적인 동작 결과를 검증해야 한다.
- 상태 코드, 본문, 헤더가 같은 실행 결과를 검증한다면 같은 `it()` 안에서 assertion한다.
- 성공, 실패, 예외, 경계값, 인증/인가, validation처럼 실행 경로나 기대 결과가 다르면 `it()` 블록을 나눈다.
- 비동기 동작은 `async/await` 또는 Vitest `resolves`/`rejects` matcher로 명확히 검증한다.
- 테스트 사이에 상태를 공유하지 않는다. 공유 리소스가 필요하면 `beforeEach`에서 만들고 `afterEach`에서 정리한다.
- 테스트는 같은 조건에서 항상 같은 결과를 내야 한다.

## 단위 테스트

- 단위 테스트는 repository root에서 `pnpm test:unit` 또는 `pnpm --filter @sheska/api test:unit`으로 실행한다.
- 단위 테스트 파일은 `apps/api/src` 아래에서 `.spec.ts` suffix를 사용한다.
- 순수 서비스, 함수, HTTP transport 없는 controller, 작은 비즈니스 로직 단위를 대상으로 한다.
- DI 설정 자체가 테스트 대상이 아니라면 HTTP 서버, 실제 Nest 애플리케이션 부트스트랩, 외부 I/O를 사용하지 않는다.
- 필요한 dependency는 직접 만들거나 가벼운 mock/stub으로 대체한다.
- DI 설정을 검증해야 할 때만 Nest testing module을 사용한다.
- 작업 단위는 entry point 호출부터 관찰 가능한 동작 결과까지의 흐름이다.
- 동작 결과는 return value, thrown exception, state change, dependency call 중 하나다.
- return value, exception, state change, dependency call은 서로 다른 결과 유형이므로 별도 `it()` 블록에서 테스트한다.

## 통합 테스트

- 통합 테스트는 repository root에서 `pnpm test:integration` 또는 `pnpm --filter @sheska/api test:integration`으로 실행한다.
- 통합 테스트 파일은 `apps/api/test` 아래에서 `.e2e-spec.ts` 또는 `.integration-spec.ts` suffix를 사용한다.
- dependency injection wiring, framework bootstrap, routing, controller response처럼 단위 테스트로 다룰 수 없는 상호작용을 검증할 때 통합 테스트를 사용한다.
- 실제 네트워크, REST API, 시스템 시간, 파일 시스템, 데이터베이스처럼 통제하기 어려운 요소를 사용하는 테스트는 단위 테스트가 아니라 통합 테스트로 분리한다.
- 모든 domain 또는 application invariant를 통합 테스트에서 반복하지 않는다. 상세한 domain/application rule은 단위 테스트에 둔다.
- Nest app integration test file은 app을 초기화한다면 `beforeEach`에서 만들고 `afterEach`에서 닫아야 한다.
- 바깥 `describe()`는 통합 대상 이름을 지정해야 한다.
- Route test에서는 안쪽 `describe()`가 controller method와 route를 나타내야 한다. 예: `describe('GET /')`.
- HTTP 상태 코드, 응답 본문, 중요한 헤더를 함께 검증한다.

## 명령어

```bash
pnpm lint:check         # ESLint 검사
pnpm typecheck          # TypeScript type checking
pnpm test:unit          # 단위 테스트
pnpm test:integration   # 통합 및 e2e 테스트
pnpm test               # 단위 테스트, 그 다음 통합 테스트
pnpm test:watch         # API package에서 Vitest watch 모드
pnpm test:cov           # API package에서 단위 테스트 커버리지
```

PR을 열기 전에 변경 범위에 맞는 검사를 실행한다.
고립된 서비스나 함수만 변경했다면 `pnpm lint:check`, `pnpm typecheck`, `pnpm test:unit`을 실행한다.
Route, module configuration, application bootstrap flow가 변경되었다면 `pnpm test:integration`도 실행한다.
