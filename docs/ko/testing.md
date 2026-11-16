---
title: 테스트 컨벤션
applies_to:
  - apps/api, apps/ui, e2e의 테스트
read_when:
  - 테스트를 쓰거나, 어느 계층에서 검증할지 정할 때
  - 다른 workspace의 서비스를 띄워 테스트할 때
related:
  - ./monorepo.md
---

# 테스트 컨벤션

## 공통
- 동작은 그것을 믿을 수 있게 증명하는 가장 싼 계층에서 검증함
- `it()` 이름은 한글로 씀. route, 식별자, 기술 용어는 원래 표기를 둠
- `it()` 하나는 동작 하나의 결과를 검증함. 같은 응답의 status, body, header는 함께 검증함
- 테스트는 다른 테스트가 남긴 상태에 기대지 않고, 같은 조건에서 항상 같은 결과를 냄
- test double은 반환값 설정과 호출 검증에는 `vi.fn()`을, 여러 메서드가 상태를 공유하면 직접 쓴 fake를 씀. 여러 spec이 같은 모양을 쓸 때만 spec 밖으로 뺌
- 통합 테스트는 검증하는 경계 바깥의 협력자만 test double로 바꿈. 증명하려는 adapter와 배선은 실제 구현을 씀
- 도메인 규칙을 검증하는 테스트에는 `// nocap: <규칙 ID>` 태그를 붙임. 규칙 여럿이면 한 줄에 하나씩 쌓음

## 계층별 책임

| 검증할 것 | 계층 |
|---|---|
| 비즈니스 로직과 도메인 불변식 | API 단위 테스트 |
| 실제 adapter 동작(DB 제약, 트랜잭션, queue, 임베더) | API 통합 테스트 |
| HTTP 응답 모양과 status | API HTTP 통합 테스트 |
| props로 그린 컴포넌트, hook, mapper | UI 단위 테스트 |
| route, query, provider가 함께 도는 화면 흐름 | UI 통합 테스트 |
| API client의 역직렬화 | UI API client 통합 테스트 |
| 폭에 따른 배치, 페이지 가로 스크롤 | UI layout 테스트 |
| 여러 페이지에 걸친 사용자 여정 | E2E |
| 외부 액터 앱(Obsidian 플러그인)의 동작 | 그 앱의 자체 테스트 |

- 위 계층의 실패가 E2E에서 처음 드러나면 E2E를 늘리지 않고 책임 있는 아래 계층의 테스트를 고침

## API
- 단위 spec은 대상 파일 옆 `__tests__`에 둠. HTTP server, Nest app, 외부 I/O를 시작하지 않음
  - Nest testing module은 DI metadata나 module 설정이 검증 대상일 때만 씀
- 통합 spec은 `test/adapters/{boundary}/{context}/`에 둠. boundary는 테스트할 주된 실제 의존성임. 예: `postgres`, `redis`, `http`
  - 그 boundary만 실제로 쓰고 관계없는 다른 boundary는 test double로 바꿈
- adapter가 소유한 동작(매핑, 오류 감싸기, 분기)은 단위 테스트로, 실제 의존성이 부과하는 동작(schema 제약, upsert, 실제 실패)은 통합 테스트로 검증함
- base class, kernel helper, 공용 정책의 보장은 소유한 곳에서 한 번만 검증함. 구체 구현은 자기 검증, 설정, override만 검증함
- helper 이름은 부수효과를 드러냄
  - `buildX`: 외부 I/O 없이 메모리에서 값, 도메인 객체, double을 만듦
  - `createX`: 저장하거나 runtime resource를 시작해 밖의 상태를 바꿈
  - `setupX`: Nest app, testing module, boundary runtime을 조립함
- spec에서 만든 Nest app과 application context는 모두 닫음

## UI
- 단위와 통합 테스트는 `jsdom` 위의 Vitest와 React Testing Library로 씀. 구현 세부보다 text, role, label처럼 사용자가 보는 것으로 query함
- 통합 테스트는 `test/` 아래에 두고, 필요한 router, React Query, provider 배선을 실제로 조립함. API 경계는 mock `SheskaApiClient`로 둠
- API client 통합 테스트는 `@sheska/api`의 `test:runtime:*`로 띄운 실제 API에 HTTP로 붙임
- Storybook story는 컴포넌트 상태를 보기 위한 fixture임. 동작의 증명이 아니므로 중요한 동작은 Vitest로도 검증함
- `jsdom`은 layout engine이 없어 폭에 따른 배치를 증명하지 못함. 배치는 `test/layout`의 Playwright 테스트가 숫자로 잼
  - 예: 320px, 640px, 1280px에서 모든 route의 페이지 가로 스크롤이 0인지 잼
  - fixture에는 긴 토큰을 섞음. 짧은 예시 데이터로는 항목이 줄어드는지 증명할 수 없음
  - 자동화할 규칙이 생기면 먼저 숫자로 잴 수 있는 형태로 바꿈

## E2E
- E2E는 실행 중인 전체 시스템을 실제 browser로 쓰며 사용자 여정 하나를 검증함
  - 렌더링, 네비게이션, 서비스 사이의 설정(환경 변수, CORS), 장애가 화면에 보이는지는 E2E만 증명함
- 브라우저 밖에서 시작하는 행위(플러그인의 업로드)는 그 앱을 자동화하지 않고, 그 앱이 쓰는 공개 API를 호출해 흉내 냄
- 사전 조건은 DB에 직접 넣지 않고 공개 API로 만듦
- 네트워크 가로채기는 API 연결을 abort하는 것만 허용함. 가짜 응답을 돌려주지 않음
  - abort는 실제 API가 죽었을 때와 같은 browser 동작임. 가짜 응답은 실제 시스템이 아님
- 내부 framework 상태나 화면에 보이지 않는 값을 검증하지 않음

## 서비스 간 테스트 런타임
- 다른 workspace가 띄워야 하는 서비스는 그 서비스의 workspace가 `test:runtime:start`, `wait`, `url`, `stop` script를 소유함
  - compose 파일, migration, port, readiness 확인, 정리는 서비스 쪽이 소유하고, 쓰는 쪽은 base URL만 앎
  - 다른 workspace가 필요로 할 때만 이 script를 만듦
- 쓰는 쪽은 그 서비스를 black box로 다룸. 공개 protocol로만 통신하고, 다른 앱의 `src`나 Nest module을 import해 조립하지 않음
- 동시에 띄울 수 있는 runtime은 `SHESKA_TEST_RUNTIME_ID`로 resource를 격리함. 한 lifecycle의 모든 명령에 같은 ID를 씀
