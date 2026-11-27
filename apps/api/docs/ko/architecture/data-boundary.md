---
title: API 데이터 경계 컨벤션
applies_to:
  - apps/api
read_when:
  - 외부에서 온 값(HTTP 요청, 업로드한 파일 내용, 외부 API 응답, 저장된 행)을 도메인 객체로 바꿀 때
  - 입력 검사를 adapter와 도메인 중 어디에 둘지 정할 때
related:
  - ./ddd.md
  - ./http-contract.md
  - ./context-integration.md
  - ../operability/error.md
---

# API 데이터 경계 컨벤션

## Parse
- 입력 검사는 더 좁은 타입을 돌려줌(parse). `boolean`이나 `void`를 돌려주는 검사(validate)를 두지 않음[^1]
  - validate는 검사로 얻은 사실을 타입에 남기지 않음. 값을 쓰는 곳마다 같은 검사를 다시 하게 됨
- 타입은 있을 수 없는 상태를 표현하지 않음
- parse를 통과한 값은 다시 검사하지 않음
- parse 실패는 exception으로 알림. 오류 채널은 [오류 정책](../operability/error.md)을 따름

## 두 경계
- 외부 값은 도메인 객체가 되기 전에 두 번 parse함

| 단계 | 소유자 | 확인하는 것 | 출력 |
|---|---|---|---|
| 구문 parse | adapter의 schema | 키가 있는가, 값의 타입이 맞는가 | port가 정한 입력 타입 |
| 의미 parse | 도메인 객체의 생성 메서드 | 도메인 규칙에 맞는가 | 도메인 객체 |

- 구문 parse는 신뢰 경계임. 믿을 수 없는 바이트를 타입이 있는 값으로 바꿈
- 의미 parse는 모델 경계임. 바깥의 모양을 도메인 모델로 바꿈
- adapter가 돌려주는 타입은 port가 정함. adapter의 schema 타입(`z.infer`)을 port 밖으로 내보내지 않음
  - 입력 형식이 바뀌면 adapter만 고치게 하기 위함

## 규칙을 둘 곳
- 규칙의 위치는 "입력 형식이 바뀌어도 이 규칙이 남는가"로 정함
  - 남으면 도메인 규칙임. 의미 parse에 둠
  - 형식을 따라 바뀌면 adapter 규칙임. 구문 parse에 둠
- 같은 규칙을 schema와 도메인에 함께 쓰지 않음
  - 두 곳에 있으면 한쪽만 바뀌어 어긋남

## 입력 경로별 경계

### 요청 본문
- 요청 모양은 계약 schema가 구문 parse함. 계약은 [HTTP 계약](./http-contract.md)을 따름
- 요청 값 안에 다른 형식이 들어 있으면, 그 형식을 읽는 adapter가 따로 구문 parse함

### 저장소
- mapper는 저장된 행을 다시 의미 parse하지 않고, `restore`와 factory로 도메인 객체를 만듦
  - 저장된 값은 쓸 때 이미 parse를 통과했음
  - 다시 parse하면 규칙이 바뀐 뒤 옛 행을 읽지 못함
- nullable 컬럼은 mapper 안에서 도메인 타입으로 바꿈. `null`을 도메인 객체로 넘기지 않음

### 외부 API와 다른 컨텍스트
- adapter가 응답을 구문 parse하고 도메인 객체로 바꿈
- 응답이 도메인 규칙을 어기면 adapter가 처리 방식을 정함
  - 도메인은 응답이 어디서 왔는지 모름
- 다른 컨텍스트에서 받은 값은 [컨텍스트 통합](./context-integration.md)의 ACL이 이 규칙을 따름

## 오류
- adapter는 구문 parse 실패를 데이터 사실로 던짐(`InvalidDataError`)
- 그 값이 호출자가 보낸 입력이면, application이 `ValidationFailedError`로 바꾸고 형식 오류 `code`를 씀
  - 같은 형식 오류라도 고칠 수 있는 쪽이 다름. 호출자 입력이면 4xx, 외부 응답이면 5xx임
- 도메인은 의미 parse 실패를 규칙마다 다른 `code`로 던짐

[^1]: Alexis King, "Parse, don't validate", 2019-11-05. https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/ (2026-11-27 확인)
