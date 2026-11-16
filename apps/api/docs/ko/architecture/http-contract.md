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
---

# API HTTP 계약 컨벤션

## 계약
- HTTP 계약은 `packages/contract`에 한 번만 정의하고 API와 클라이언트가 함께 import함
- 계약은 도메인 모델과 따로 둠. 도메인 리팩터링이 API 변경이 되지 않게 함
- 필드와 오류 code의 뜻은 계약의 JSDoc에만 적음
- 서버만 해석하는 값은 불투명한 문자열로 둠. 클라이언트가 내부 모양에 기대지 않게 함
- 응답은 계약의 schema로 `parse`해서 보냄. 계약에 없는 필드가 나가지 않음

## 오류 code
- 클라이언트는 status가 아니라 `code`로 오류를 구분함
- endpoint가 돌려줄 수 있는 `code`는 계약에 endpoint마다 적음. 목록에 없는 `code`는 서버가 내부 오류로 바꿈
- 클라이언트는 모르는 `code`를 일반 오류로 처리함. 서버가 먼저 배포될 수 있음

## 하위 호환
- 지금은 계약을 바꿀 때 API, UI, 플러그인을 함께 고침. 지켜야 할 이전 클라이언트가 없음
- 플러그인을 다른 사용자에게 배포한 뒤에는 필드와 `code`를 더하기만 하고 지우거나 뜻을 바꾸지 않음
