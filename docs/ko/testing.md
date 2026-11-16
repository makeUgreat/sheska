---
title: 테스트 컨벤션
applies_to:
  - apps/api, apps/ui, e2e의 테스트
read_when:
  - 테스트를 쓰거나, 어느 계층에서 검증할지 정할 때
  - 다른 workspace의 서비스를 띄워 테스트할 때
---

# 테스트 컨벤션

## 공통
- 동작은 그것을 믿을 수 있게 증명하는 가장 싼 계층에서 검증함
- `it()` 이름은 한글로 쓰고, `it()` 하나는 동작 하나의 결과를 검증함
- 테스트는 다른 테스트가 남긴 상태에 기대지 않음
- 통합 테스트는 검증하는 경계 바깥의 협력자만 test double로 바꿈
- 도메인 규칙을 검증하는 테스트에는 `// nocap: <규칙 ID>` 태그를 붙임

## 계층별 책임

| 검증할 것 | 계층 |
|---|---|
| 도메인 불변식과 비즈니스 로직 | API 단위 |
| 실제 의존성(DB, queue, 임베더)이 부과하는 동작 | API 통합 |
| HTTP 응답 모양과 status | API HTTP 통합 |
| 컴포넌트, hook, mapper | UI 단위 |
| 여러 UI 협력자가 함께 도는 화면 흐름 | UI 통합 |
| 폭에 따른 배치 | UI layout |
| 여러 페이지에 걸친 사용자 여정 | E2E |

- 아래 계층의 실패가 E2E에서 처음 드러나면 E2E를 늘리지 않고 아래 계층의 테스트를 고침

## API
- 단위 테스트는 server, Nest app, 외부 I/O를 시작하지 않음
- 통합 테스트는 주된 실제 의존성 하나를 boundary로 정하고, 나머지 boundary는 test double로 바꿈
- 공용 보장(base class, kernel helper)은 소유한 곳에서 한 번만 검증함
- helper 이름은 부수효과를 드러냄. `buildX`는 메모리, `createX`는 밖의 상태 변경, `setupX`는 runtime 조립임

## UI
- 사용자가 보는 text, role, label로 query함
- Storybook story는 상태를 보는 fixture이고 동작의 증명이 아님
- `jsdom`은 layout engine이 없어 배치를 증명하지 못함. 배치는 실제 browser의 layout 테스트가 숫자로 잼

## E2E
- E2E만 렌더링, 네비게이션, 서비스 사이의 설정, 장애 표시를 증명함
- 다른 앱(Obsidian 플러그인)은 자동화하지 않고 그 앱이 쓰는 공개 API를 호출해 흉내 냄
- 사전 조건은 DB가 아니라 공개 API로 만듦
- 네트워크는 연결 abort만 허용하고 가짜 응답을 돌려주지 않음

## 서비스 간 테스트 런타임
- 다른 workspace가 띄워야 하는 서비스는 그 서비스의 workspace가 `test:runtime:*` script와 세부를 소유함
- 쓰는 쪽은 그 서비스를 공개 protocol로만 다루고 다른 앱의 소스를 import하지 않음
- 동시에 띄울 수 있는 runtime은 `SHESKA_TEST_RUNTIME_ID`로 격리함
