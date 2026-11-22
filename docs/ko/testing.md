---
title: 테스트 컨벤션
applies_to:
  - apps/api, apps/ui의 테스트
read_when:
  - 테스트를 쓰거나, 어느 계층에서 검증할지 정할 때
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
| 화면이 없는 로직(순수 함수, hook, mapper, HTTP client) | UI 단위 |
| 화면에 그려지는 것(컴포넌트 상태, 화면 흐름, 폭에 따른 배치) | UI 화면 |

## API
- 단위 테스트는 server, Nest app, 외부 I/O를 시작하지 않음
- 통합 테스트는 주된 실제 의존성 하나를 boundary로 정하고, 나머지 boundary는 test double로 바꿈
- 공용 보장(base class, kernel helper)은 소유한 곳에서 한 번만 검증함
- helper 이름은 부수효과를 드러냄. `buildX`는 메모리, `createX`는 밖의 상태 변경, `setupX`는 runtime 조립임

## UI
- 사용자가 보는 text, role, label로 query함
- UI 화면 테스트는 Storybook story를 실제 browser에 그리고 `play`에서 검증함
- 상태를 보여 주는 story와 동작을 검증하는 story를 나눔. 검증만 하는 story에는 `!dev` tag를 붙여 사이드바에서 숨김
- story는 서버 없이 그림. HTTP는 가짜 client로 바꾸고, 호출은 spy로 검증함
- 기본은 동작 줄이기(reduced motion)를 켜고 돌림. 움직임을 검증하는 story만 끔
