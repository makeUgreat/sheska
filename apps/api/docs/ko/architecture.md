---
title: API 아키텍처 컨벤션
lang: ko
audience: both
applies_to:
  - apps/api
source: ../en/architecture.md
last_synced: 2026-06-27
related:
  - ./error.md
  - ./ddd.md
  - ./persistence.md
  - ./source-dependency.md
  - ./runtime-wiring.md
---

# API 아키텍처 컨벤션

이 문서는 API architecture map이며, 자세한 규칙은 연결된 문서를 사용한다.

## 적용 범위

- API code의 high-level source area를 결정할 때 이 문서를 사용한다.
- 이 문서는 architectural boundary를 이름 붙이고 상세 정책 문서로 라우팅한다. DDD, source dependency, runtime wiring, persistence, error policy를 대체하지 않는다.

## 아키텍처 축

API architecture는 두 축으로 설명한다:

- DDD model boundary는 model, language, responsibility가 유효한 범위를 정의한다.
- Dependency와 layer boundary는 어떤 code가 다른 code에 의존할 수 있는지 정의한다.

Error, exception, system error를 정의, 변환, masking, 노출하는 경우 error policy를 읽는다.

## 관련 문서

- [API 오류 정책](./error.md): error meaning, category, transformation, structure, unexpected system error handling 규칙.
- [API DDD 컨벤션](./ddd.md): bounded context, implementation module, domain kernel, domain model 규칙.
- [API Persistence 정책](./persistence.md): database schema, migration, ORM persistence, repository mapper, storage constraint 규칙.
- [API Source Dependency 컨벤션](./source-dependency.md): import direction, layer boundary, framework import 규칙.
- [API Runtime Wiring 컨벤션](./runtime-wiring.md): NestJS DI, provider registration, platform runtime, port binding 규칙.

## Source Boundary

High-level API source boundary는 다음과 같다:

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

이 map은 전체 folder contract가 아니라 architectural boundary를 이름 붙인다.
Lower-level directory와 layer folder는 code가 필요할 때만 만든다.
Context layer, `platform/nest`, `kernels` 내부의 subdirectory는 feature, adapter type, framework need에 따라 달라질 수 있다.

## Directory 읽기 규칙

- 먼저 code가 bounded context, kernel, core, platform 중 어디에 속하는지 판단한다.
- 자세한 placement, import, wiring 규칙은 DDD, source dependency, runtime wiring 문서를 따른다.
