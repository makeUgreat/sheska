---
title: API 아키텍처 컨벤션
lang: ko
audience: both
applies_to:
  - apps/api
source: ../../en/architecture/architecture.md
last_synced: 2026-09-07
related:
  - ../operability/error.md
  - ./ddd.md
  - ../persistence/persistence.md
  - ./infrastructure.md
  - ./source-dependency.md
  - ./runtime-wiring.md
---

# API 아키텍처 컨벤션

- 이 문서는 API 아키텍처 개요이며, 자세한 규칙은 관련 문서를 사용한다.

## 적용 범위

- API 코드의 상위 소스 영역을 결정할 때 이 문서를 사용한다.
- 이 문서는 아키텍처 경계를 이름 붙이고 상세 정책 문서로 라우팅한다.
  - DDD, source dependency, runtime wiring, persistence, error policy를 대체하지 않는다.

## 아키텍처 축

- API 아키텍처는 두 축으로 설명한다.
  - DDD model boundary는 모델, 언어, 책임이 유효한 범위를 정의한다.
  - Dependency와 layer boundary는 어떤 코드가 다른 코드에 의존할 수 있는지 정의한다.

- `presentation`과 `infrastructure`는 프로토콜 vs 기술이 아니라 inbound/outbound(driving/driven) 역할로 나눈다.
  - `presentation`은 자기 주도로 application을 호출하는 모든 코드다.
  - HTTP controller뿐 아니라 queue consumer, scheduled job 같은 non-protocol trigger도 `presentation`에 속한다.
  - `infrastructure`는 application-owned port를 구현해 외부 기술에 접근하는 모든 코드다.
  - Repository뿐 아니라 queue dispatcher/producer도 `infrastructure`에 속한다.
  - 같은 기술이 서로 다른 파일로 양쪽에 모두 나타날 수 있다.
  - 전체 규칙은 source dependency 컨벤션의 Presentation/Infrastructure Layer 섹션을 참고한다.

- Application error, exception, protocol error response, system error를 정의, 변환, 마스킹, 노출하는 경우 error policy를 읽는다.

## 관련 문서

- [API 오류 정책](../operability/error.md): application error의 의미, category, 변환, 응답 구조, 예상하지 못한 system error 처리 규칙.
- [API DDD 컨벤션](./ddd.md): bounded context, implementation module, domain kernel, domain model 규칙.
- [API Persistence 정책](../persistence/persistence.md): database schema, migration, ORM persistence, repository mapper, storage constraint 규칙.
- [API Infrastructure 컨벤션](./infrastructure.md): infrastructure adapter 파일 이름, 디렉토리 구조, adapter 컨벤션 규칙.
- [API Source Dependency 컨벤션](./source-dependency.md): import 방향, layer boundary, framework import 규칙.
- [API Runtime Wiring 컨벤션](./runtime-wiring.md): NestJS DI, provider 등록, platform runtime, port binding 규칙.

## 소스 경계

- API의 상위 소스 경계는 다음과 같다:

```text
src/
  main.ts
  core/
  kernels/
    domain/
    application/
    infrastructure/
    presentation/
  platform/
    nest/
  contexts/
    {context-name}/
      domain/
      application/
      infrastructure/
      presentation/
```

- 이 구조는 전체 폴더 계약이 아니라 아키텍처 경계를 이름 붙이는 지도다.
- 하위 디렉토리와 layer 폴더는 코드가 필요할 때만 만든다.
- Context layer, `platform/nest`, `kernels` 내부의 하위 디렉토리는 feature, adapter type, framework 필요에 따라 달라질 수 있다.

## Directory 읽기 규칙

- 먼저 코드가 bounded context, kernel, core, platform 중 어디에 속하는지 판단한다.
- 자세한 placement, import, wiring 규칙은 DDD, source dependency, runtime wiring 문서를 따른다.
