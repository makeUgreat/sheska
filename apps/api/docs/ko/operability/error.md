---
title: API 오류와 로깅 정책
applies_to:
  - apps/api
read_when:
  - 오류를 정의, 변환, 마스킹, 전파하거나 리뷰할 때
  - 로그를 남길지, 어디서, 어떤 레벨로 남길지 정할 때
related:
  - ./observability.md
  - ./fault-tolerance.md
  - ../architecture/http-contract.md
  - ../architecture/context-integration.md
---

# API 오류와 로깅 정책

## 오류 채널
- 이 프로젝트는 exception을 기본 오류 채널로 씀
  - domain 불변 조건 실패, adapter 실패, 운영 실패, programming error는 모두 exception이나 rejected promise로 전달함
  - domain 생성자와 factory는 exception으로 불변 조건을 지킴
- `Result` 같은 failure 계약은 기본으로 추가하지 않음
  - 지금은 그런 계약이 없음. 추가하는 것은 있는 채널을 고르는 일이 아니라 따로 내릴 결정임
  - 호출자에게 안정적인 분기 동작이 있고 exception보다 명확할 때만 추가함
- exception은 복구하거나, 맥락을 더하거나, protocol response로 바꿀 때만 catch함
  - use case는 infrastructure, domain, system exception을 대개 그대로 전파함

## Error 클래스
- 이 프로젝트의 error는 모두 `core/errors`의 `SheskaError`를 상속함
  - 경계는 `instanceof SheskaError`로 이 프로젝트의 오류를 알아봄. `kind`와 `code`만 흉내 낸 값은 알 수 없는 실패로 마스킹함
- `kind`는 필드가 아니라 구체 클래스임. 던지는 쪽은 `kind`를 쓰지 않고 클래스를 고름
  - 같은 실패 의미에는 같은 클래스를 씀. 그래서 경계에서 같은 정책을 받음
  - 다른 정책이 필요하면 기존 클래스를 재사용하지 않고 `ERROR_KIND`에 새 kind와 클래스를 더함
- 레이어마다 클래스를 나누지 않음. 오류의 소유자는 던지는 위치와 `code`가 나타냄
- 실패 원인마다 다른 `code`를 씀. 같은 메서드가 던져도 연산 실패와 부재는 `code`를 공유하지 않음

## 변환과 마스킹
- 오류는 소유자, 독자, 노출 정책이 바뀌는 경계에서만 변환함
  - 호출이 폴더 경계를 넘었다는 이유만으로 감싸지 않음
  - use case는 infrastructure 의존성이 실패했다는 이유만으로 그 exception을 변환하지 않음
  - bounded context 사이에서는 통신 계약으로 변환함. [context integration 컨벤션](../architecture/context-integration.md)을 따름
- protocol 경계는 `kind` 하나로 status, 노출 범위, 로그 레벨을 정함
  - 5xx로 가는 `kind`는 `code`와 `message`까지 마스킹함. adapter와 vendor 식별자를 밖에 보이지 않음
  - 4xx로 가는 `kind`는 `code`와 `message`를 보임. `details`는 호출자가 조치할 수 있을 때만 보임
  - 4xx로 보이는 `code`는 endpoint의 HTTP 계약에 선언한 것만 내보냄. 응답 형태와 함께 [HTTP 계약 컨벤션](../architecture/http-contract.md)을 따름
  - 이 프로젝트가 소유하지 않은 실패는 내부 오류로 마스킹함
- 클라이언트 코드는 `message` 문구를 파싱하지 않음. `message`는 바뀌거나 마스킹될 수 있음
- 알 수 없는 실패를 삼키지 않음. presentation이나 process 경계까지 전파하고 원래 `cause`를 보존함

## Vendor 오류
- adapter가 붙이는 `code`는 호출자의 의도가 아니라 데이터 사실을 나타냄
  - adapter는 행이 이미 있는지는 알지만 호출자가 무엇을 하려 했는지는 모름. 비즈니스 맥락은 `message`에 담음
- vendor 제약 위반은 호출자가 조치할 수 있는지로 분류함
  - unique 위반은 이미 있는 리소스를 다시 만들려 한 것이라 `ConstraintViolationError`(4xx)임
  - foreign key, not-null, check 위반은 schema가 금지한 데이터를 코드가 넘긴 것이라 `UnexpectedError`(5xx)임
- adapter가 의존하는 vendor 필드(DB error code, SDK error code, HTTP 응답 metadata)는 adapter 경계에서 검증함

## 로깅
- 오류는 지나가는 모든 레이어가 아니라 관찰 가능한 경계에서 한 번만 로그로 남김
  - 관찰 가능한 경계는 오류를 다시 던지지 않고 처리를 끝내는 곳임. HTTP에서는 전역 exception filter임
  - 모든 레이어가 기록하면 metric과 alert이 중복되고 사고 건수가 틀어짐
- 로그를 남기거나 다시 던지거나 둘 중 하나만 함. 다시 던질 때는 로그 없이 맥락을 더하고 `cause`를 보존함
- 로그 레벨은 `kind`별 정책이 정함
  - `error`: 조사나 조치가 필요한 최종 실패
  - `warn`: 복구했거나, 기능을 낮췄거나, 일부러 삼킨 운영상 의미 있는 실패
  - 4xx로 가는 비즈니스 실패는 `error`로 남기지 않음. 장애 신호가 오염되어 실제 사고를 찾기 어려워짐
- 오류를 삼키는 catch는 그 자리에서만 기록할 수 있음. 복구한 일시적 실패는 기록하지 않음
- domain과 application은 kernel이 소유한 `Logger` 계약만 씀. 구현체는 runtime 배선이 고름
