---
title: UI 테스트 컨벤션
lang: ko
audience: both
applies_to:
  - apps/ui
source: ../en/test.md
related:
  - ./index.md
  - ./visual-regression.md
---

# UI 테스트 컨벤션

UI 앱은 `jsdom` 기반 Vitest를 사용하며 단위 테스트와 통합 테스트를 분리한다.
각 동작은 신뢰성 있게 증명할 수 있는 가장 저렴한 test layer에서 검증하는 것을 선호한다.

## 적용 범위

- UI test type, test file naming, test setup shape, UI test command를 선택할 때 이 문서를 사용한다.
- Browser-rendered visual regression test는 [UI Visual Regression 컨벤션](./visual-regression.md)에서 다룬다.
- Business-flow browser E2E test는 `e2e` workspace 컨벤션에서 다룬다.

## 테스트 도구

- `apps/ui`의 단위 테스트와 통합 테스트는 반드시 Vitest를 사용한다.
- Vitest 설정은 named `test.projects`를 사용하는 `apps/ui/vite.config.ts`에 모아둔다.
- 단위 테스트와 통합 테스트 모두 `jsdom`을 사용한다.
- React rendering과 user-observable assertion에는 React Testing Library를 사용한다.

## 테스트 케이스 설계

- `describe()`에는 테스트 대상 이름을 사용하는 것을 선호한다.
- `it()` 테스트 케이스 이름은 팀이 동작 의도를 쉽게 검토할 수 있도록 한글 중심으로 작성해야 한다. Route, code identifier, technical term은 더 명확하다면 원문 언어를 유지할 수 있다.
- 각 `it()`는 하나의 구체적인 관찰 가능한 동작 결과를 검증해야 한다.
- 구현 세부사항보다 text, role, label, visible state처럼 사용자가 관찰할 수 있는 query를 선호한다.
- 테스트 사이에 상태 공유는 피한다. 더 좁은 helper가 isolation을 이미 보장하는 경우가 아니라면 테스트마다 새 query client, mock client, rendered tree를 만든다.
- 테스트는 같은 조건에서 항상 같은 결과를 내야 한다.

## Test Double

- Test code는 `vi.fn()`, `vi.spyOn()`, mock return 설정, mock assertion 같은 Vitest helper를 사용할 수 있다.
- Collaborator가 설정된 반환값, 호출 검증, 단순 error injection만 필요로 한다면 mock function을 선호한다.
- Test double에 의미 있는 상태나 여러 method가 공유하는 behavior가 필요하다면 직접 작성한 fake를 사용한다.
- Test double은 기본적으로 spec file 안에 둔다. 여러 spec이 같은 setup shape를 필요로 할 때만 shared factory로 추출한다.
- 통합 테스트에서는 검증하려는 UI boundary 바깥의 collaborator에만 test double을 사용한다. 통합 테스트가 증명하려는 router, React Query, provider wiring은 실제로 유지해야 한다.

## 테스트 계층

### Visual Design Check

`jsdom` 기반 Vitest는 behavior, accessibility-oriented structure, data state, routing을 검증하기 위한 도구다.
실제 layout/rendering engine을 실행하지 않기 때문에 Stitch와 pixel-level 또는 perceptual alignment가 맞는지는 증명할 수 없다.

변경이 Stitch design 구현을 목표로 한다면 automated `jsdom` test는 loading, empty, error, navigation, form interaction, accessible label 같은 관찰 가능한 동작에 집중한다.
Visual alignment는 [디자인 시스템](./design.md)에 설명된 browser 기반 review로 확인한다.

Vitest `jsdom` suite에는 screenshot 또는 pixel-diff assertion을 추가하지 않는다.
Screenshot 또는 pixel-diff coverage가 필요하면 UI visual regression 정책을 사용한다.

### 단위 테스트

- 단위 테스트 파일은 `*.spec.ts` 또는 `*.spec.tsx`를 사용한다.
- 단위 테스트는 API client method, pure helper, hook, mapper, 작은 component behavior처럼 가장 작은 유용한 책임을 대상으로 한다.
- 동작을 unit 직접 호출이나 최소 props를 사용한 component rendering으로 증명할 수 있다면 route-level provider tree를 조립하지 않는다.
- Network call, API client, timer, 기타 external effect는 mock 또는 stub으로 대체한다.
- Success, failure, boundary, error case가 unit의 contract를 정의한다면 대표 case를 검증한다.

### 통합 테스트

- 통합 테스트 파일은 `test/` 아래에 두고 `*.integration-spec.ts` 또는 `*.integration-spec.tsx`를 사용한다.
- App-level route 또는 composition 통합 테스트는 `test/app/`, page-level 통합 테스트는 `test/pages/`, shared test setup 또는 helper는 `test/support/` 아래에 둔다.
- UI 통합 테스트는 `MemoryRouter`, `QueryClientProvider`, `ApiClientProvider`처럼 해당 동작에 필요한 실제 UI wiring을 조립해 app-level 또는 page-level behavior를 검증한다.
- API boundary는 기본적으로 mocked `SheskaApiClient`로 표현한다.
- Loading, empty, success, error, route parameter, navigation, user interaction처럼 여러 UI collaborator가 함께 동작해야 하는 흐름에는 통합 테스트를 사용한다.
- 모든 unit-level branch를 통합 테스트에서 반복하지 않는다. 상세한 client, mapper, component contract coverage는 단위 테스트에 둔다.

### API Client 통합 테스트

- API client 통합 테스트는 `test/api-client/` 아래에 두고 `*.integration-spec.ts`를 사용한다.
- API client 통합 테스트는 UI가 소유한 `SheskaApiClient`를 실제 API runtime에 HTTP로 붙여 검증한다.
- 이 테스트는 반드시 `@sheska/api`의 `test:runtime:*` package script로 API를 시작해야 하며, API source file이나 Nest module을 import해서는 안 된다.
- UI test process가 사용하는 API runtime을 격리하기 위해 `SHESKA_TEST_RUNTIME_ID`를 사용한다.
- 테스트 데이터는 runtime service가 소유한 public HTTP API를 통해 준비한다. 다른 service의 database에 seed data를 직접 insert하지 않는다.
- API client 통합 테스트는 Docker 기반 API runtime을 build하고 실행하므로 기본 jsdom UI 통합 테스트와 분리한다.

## 명령어

```bash
pnpm --filter @sheska/ui lint:check         # ESLint 검사
pnpm --filter @sheska/ui typecheck          # TypeScript type checking
pnpm --filter @sheska/ui test:unit          # 단위 테스트
pnpm --filter @sheska/ui test:integration   # Vitest/jsdom UI 통합 테스트
pnpm --filter @sheska/ui test:integration:api-client # API test runtime을 대상으로 하는 API client 통합 테스트
pnpm --filter @sheska/ui test               # 단위 테스트, 그 다음 통합 테스트
pnpm --filter @sheska/ui test:watch         # 단위 테스트용 Vitest watch mode
```

PR을 열기 전에 변경 범위에 맞는 검사를 실행한다.
UI behavior가 변경됐다면 static check에 더해 `pnpm --filter @sheska/ui test`를 실행한다.
