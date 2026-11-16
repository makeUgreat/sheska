---
title: API HTTP 계약 컨벤션
applies_to:
  - apps/api
  - packages/contract
read_when:
  - HTTP endpoint를 추가하거나 요청, 응답, 오류 code 목록을 바꿀 때
  - UI나 Obsidian 플러그인에서 API를 호출하는 코드를 추가하거나 바꿀 때
related:
  - ../operability/error.md
  - ../../../../../docs/ko/monorepo.md
---

# API HTTP 계약 컨벤션

## 계약의 위치
- API의 HTTP 계약은 `@sheska/contract`(`packages/contract`)에 zod schema로 한 번만 정의함. API, UI, Obsidian 플러그인이 모두 이것을 import함
  - 한쪽에만 선언하면 API와 클라이언트가 갈라져도 타입 검사가 잡지 못함
- 계약은 도메인 모델과 따로 정의함. API 안에서는 presentation, presentation kernel, `platform`만 계약을 import함
  - 도메인 타입을 그대로 내보내면 도메인 리팩터링이 곧 API 변경이 됨
  - use case 결과는 HTTP 밖에서도 쓰임. 결과를 계약에 묶으면 결과의 뜻이 HTTP 모양에 끌려감
- 필드와 오류 code의 뜻을 이름으로 알 수 없으면 계약에 JSDoc으로 적음. controller, use case, DB schema에 다시 적지 않음
- 서버만 해석하는 값은 계약에 불투명한 문자열로 둠. 예: 페이지 cursor
  - 해석 방식을 계약에 넣으면 클라이언트가 내부 모양에 기대고, 서버가 인코딩을 바꿀 수 없게 됨
- controller는 use case 결과를 계약의 응답 schema로 `parse`해서 보냄. 계약에 없는 필드가 응답에 섞여 나가지 않음

## 오류 code
- 클라이언트는 HTTP status가 아니라 오류 응답의 `code`로 오류를 구분함. 같은 status에도 원인이 여러 개일 수 있음
- endpoint가 돌려줄 수 있는 오류 code는 계약의 `errors`에 endpoint마다 적음
  - 모든 endpoint에 공통인 `internal.unexpected`, `internal.unavailable`은 적지 않음
  - 클라이언트가 처리할 오류를 서버 코드를 읽지 않고 알 수 있음
- handler가 목록에 없는 code를 던지면 서버가 예상하지 못한 오류로 바꿈
  - throw는 타입에 드러나지 않아서 컴파일 시점에 목록과 맞출 수 없음. 대신 목록 밖 code가 클라이언트로 나가지 않게 막고 누락을 내부 오류 로그로 드러냄
- 클라이언트는 목록에 없는 code도 올 수 있다고 보고 모르는 code를 일반 오류로 처리함
  - 서버가 먼저 배포되어 새 code를 더하면 이전 클라이언트는 그 code를 모름

## 하위 호환
- 지금은 계약을 바꿀 때 API, UI, 플러그인을 함께 고침. 필드와 오류 code를 지우거나 뜻을 바꿔도 됨
  - 지금 플러그인은 소유자가 자기 vault에 직접 설치하고 업데이트함. 지켜야 할 이전 클라이언트가 없음
- 플러그인을 다른 사용자에게 처음 배포한 뒤에는 하위 호환을 지킴. 필드와 오류 code는 더하기만 하고 지우거나 뜻을 바꾸지 않음
  - 설치된 플러그인은 서버보다 늦게 업데이트될 수 있음. 모노레포의 타입 공유는 이미 설치된 이전 버전과의 호환을 보장하지 않음
