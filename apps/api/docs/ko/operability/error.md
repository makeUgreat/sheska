---
title: API 오류와 로깅 정책
applies_to:
  - apps/api
read_when:
  - 오류를 정의, 변환, 마스킹, 전파하거나 리뷰할 때
  - 로그를 남길지, 어디서, 어떤 레벨로 남길지 정할 때
related:
  - ./fault-tolerance.md
  - ../architecture/http-contract.md
---

# API 오류와 로깅 정책

## 오류 채널
- exception을 기본 오류 채널로 씀
- `Result` 같은 failure 계약은 기본으로 두지 않음. 호출자에게 exception보다 명확한 분기가 있을 때만 따로 결정해 추가함
- exception은 복구하거나, 맥락을 더하거나, protocol response로 바꿀 때만 catch함

## Error 클래스
- 이 프로젝트의 error는 모두 `SheskaError`를 상속함. 흉내만 낸 값은 알 수 없는 실패로 마스킹함
- `kind`는 필드가 아니라 클래스로 정함. 같은 실패 의미에는 같은 클래스를 써서 경계에서 같은 정책을 받음
- 레이어마다 클래스를 나누지 않음. 소유자는 던지는 위치와 `code`가 나타냄
- 실패 원인마다 다른 `code`를 씀

## 변환과 마스킹
- 오류는 소유자, 독자, 노출 정책이 바뀌는 경계에서만 변환함. 폴더 경계를 넘었다는 이유로 감싸지 않음
- protocol 경계는 `kind` 하나로 status, 노출 범위, 로그 레벨을 정함
  - 5xx는 `code`와 `message`까지 마스킹함
  - 4xx는 `code`와 `message`를 보이고, `details`는 호출자가 조치할 수 있을 때만 보임
- 클라이언트는 `message` 문구에 기대지 않음
- 알 수 없는 실패를 삼키지 않음. 경계까지 전파하고 `cause`를 보존함

## Vendor 오류
- adapter의 `code`는 호출자의 의도가 아니라 데이터 사실을 나타냄. adapter는 호출자가 무엇을 하려 했는지 모름
- 제약 위반은 호출자가 조치할 수 있는지로 분류함
  - unique 위반만 4xx임. 나머지 제약 위반은 코드의 문제라 5xx임

## 로깅
- 오류는 관찰 가능한 경계에서 한 번만 로그로 남김. 모든 레이어가 기록하면 사고 건수가 틀어짐
- 로그를 남기거나 다시 던지거나 둘 중 하나만 함
- 4xx로 가는 비즈니스 실패는 `error` 레벨로 남기지 않음. 장애 신호가 오염됨
- 복구한 일시적 실패는 기록하지 않음
- domain과 application은 kernel의 `Logger` 계약만 씀
