---
title: API HTTP 계약 컨벤션
applies_to:
  - apps/api
  - packages/contract
read_when:
  - HTTP endpoint를 추가하거나 요청·응답 모양, 오류 code 목록을 바꿀 때.
  - UI나 Obsidian 플러그인에서 API를 호출하는 코드를 추가하거나 바꿀 때.
related:
  - ../operability/error.md
  - ./source-dependency.md
  - ../../../../../docs/ko/monorepo.md
---

# API HTTP 계약 컨벤션

## 적용 범위

- API가 공개하는 HTTP endpoint의 경로, 요청, 응답, 오류 code를 정의하고 바꿀 때 이 문서를 사용한다.
- API, UI, Obsidian 플러그인 중 HTTP 계약을 쓰는 쪽은 모두 이 문서를 따른다.
- 오류를 어떤 kind로 분류하고 status와 노출 범위를 어떻게 정할지는 [오류 정책](../operability/error.md)이 소유한다.

## 계약의 위치

- API가 공개하는 HTTP 계약은 `@sheska/contract`(`packages/contract`)에 zod schema로 한 번만 정의한다.
  API, UI, Obsidian 플러그인은 모두 이 계약을 import한다.
  - 계약을 한쪽에만 선언하면 API와 클라이언트의 스펙이 갈라지고, 타입 검사로도 잡히지 않는다.
- 계약은 도메인 모델과 따로 정의한다. API 안에서는 presentation, presentation kernel, `platform`만 계약을 import한다.
  - 도메인 타입을 그대로 내보내면 도메인 리팩터링이 곧 API 변경이 된다.
  - use case 결과는 HTTP 말고 다른 경로에서도 쓰일 수 있다. use case 결과를 계약에 묶으면 결과의 뜻이 HTTP 모양에 끌려간다.
  - import 범위는 `apps/api/dependency-cruiser/rules/source-dependency.cjs`의
    `api-http-contract-only-from-presentation` 규칙이 검증한다.
- 필드와 오류 code의 뜻이나 제약을 이름만으로 알 수 없으면 계약에 JSDoc으로 적는다.
  같은 설명을 controller, use case, DB 스키마에 다시 적지 않는다.
  - 계약은 API와 클라이언트가 함께 읽는 곳이다. 여러 곳에 적으면 한 곳만 고쳐져 설명이 서로 달라진다.

## Endpoint 정의

- endpoint 하나는 `defineApi({ method, path, query, request, response, errors })`로 정의한다.
  - `query`는 query string, `request`는 JSON 본문, `response`는 성공 응답 본문이다. 없는 것은 생략한다.
- 경로는 서버 라우팅 문법으로 적고 식별자만 둔다. 예: `/sources/:id`
  - 클라이언트는 `pathOf(Api.x, { id })`로 경로를 만든다. 경로에 넣는 값은 `pathOf`가 인코딩한다.
- query string의 숫자는 `z.coerce.number<number>()`로 받는다.
  - query string 값은 항상 문자열로 온다. 타입 인자를 주어야 클라이언트 쪽 입력 타입(`ApiQuery`)이 `unknown`이 아니라 `number`가 된다.
- 서버만 해석하는 값은 계약에 불투명한 문자열로 둔다. 예: 페이지 cursor
  - 계약에 해석 방식을 넣으면 클라이언트가 그 내부 모양에 기대게 되고, 서버가 인코딩을 바꿀 수 없게 된다.
  - presentation은 계약 schema를 `extend`해서 그 필드만 해석하는 schema로 검증한다.

## Controller

- controller는 계약의 경로와 오류 code 목록을 handler에 붙인다. 예: `@Get(SourceApi.get.path)`, `@ErrorCodes(SourceApi.get.errors)`
- 요청 본문과 query는 `new ZodValidationPipe(schema)`로 계약의 schema에 맞춰 검증한다.
  - 검증에 실패하면 `request.validation_failed`로 응답하고 handler를 호출하지 않는다.
- controller는 use case 결과를 계약의 응답 schema로 `parse`해서 보낸다.
  - 계약에 없는 필드가 응답에 섞여 나가지 않는다.
  - `Date`처럼 계약과 표현이 다른 값은 controller가 계약의 표현(ISO 문자열)으로 바꾼다.
- 결과의 타입이 계약과 맞으면 `satisfies ApiResponse<typeof Api.x>`로 컴파일 시점에도 맞춘다.
  - use case 결과의 타입이 계약보다 넓으면(예: 상태가 `string`) `satisfies`를 쓸 수 없다. 이때는 `parse`가 런타임에 검증한다.

## 오류 code

- 클라이언트는 HTTP status가 아니라 오류 응답의 `code`로 오류를 구분한다.
  - 같은 status에도 원인이 여러 개일 수 있다.
- endpoint가 돌려줄 수 있는 오류 code는 계약의 `errors`에 endpoint별 목록으로 적는다.
  - 모든 endpoint가 돌려줄 수 있는 `internal.unexpected`, `internal.unavailable`은 적지 않는다.
  - 요청을 검증하는 endpoint는 `request.validation_failed`를 적는다.
  - 클라이언트가 어떤 오류를 처리해야 하는지 서버 코드를 읽지 않고 알 수 있다.
- handler가 목록에 없는 code의 오류를 던지면 `DeclaredErrorCodesInterceptor`가 예상하지 못한 예외로 바꾼다.
  - throw는 타입에 드러나지 않아서 handler가 던지는 code와 계약의 목록을 컴파일 시점에 맞출 수 없다.
    대신 목록 밖 code가 클라이언트로 나가지 않게 막고, 누락은 내부 오류 로그로 드러낸다.
  - [오류 정책](../operability/error.md)에서 code를 마스킹하는 kind(5xx)는 바꾸지 않는다. 그 오류의 code는 원래 밖으로 나가지 않는다.
- 클라이언트는 목록에 없는 code도 받을 수 있다고 보고, 모르는 code는 일반 오류로 처리한다.
  - 서버가 먼저 배포되어 새 code를 추가하면 이전 버전 클라이언트는 그 code를 모른다.

## 하위 호환

- Obsidian 플러그인을 소유자 vault 밖으로 배포하기 전에는 계약을 바꿀 때 API, UI, 플러그인을 함께 고친다.
  필드와 오류 code를 지우거나 뜻을 바꿔도 된다.
  - 지금 플러그인은 소유자가 자기 vault에 직접 설치하고 업데이트한다. 지켜야 할 이전 버전 클라이언트가 없다.
  - 쓰이지 않는 호환 코드를 남기면 경로만 늘어난다.
- 플러그인을 다른 사용자에게 처음 배포한 뒤에는 계약을 하위 호환을 유지하며 바꾼다.
  필드와 오류 code는 추가만 하고, 삭제하거나 뜻을 바꾸지 않는다.
  - 설치된 플러그인은 서버보다 늦게 업데이트될 수 있다. 모노레포의 타입 공유는 이미 설치된 이전 버전과의 호환을 보장하지 않는다.
