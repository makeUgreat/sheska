---
title: API 아키텍처 컨벤션
lang: ko
audience: both
applies_to:
  - apps/api
source: ../en/architecture.md
last_synced: 2026-06-19
related:
  - ./ddd.md
  - ./source-dependency.md
  - ./runtime-wiring.md
---

# API 아키텍처 컨벤션

이 API는 하나의 deployable API 안에 하나의 bounded context를 둔다.
Implementation module은 그 context 내부 code를 조직한다.
Layer boundary는 각 module 내부 code를 조직하기 위한 기준이다.

API architecture는 세 축으로 설명한다:

- API bounded context는 model, language, responsibility가 유효한 범위를 정의한다.
- Implementation module은 business capability 또는 runtime ownership 기준으로 code를 묶는다.
- Dependency와 wiring boundary는 어떤 code가 다른 code를 import, compose, call할 수 있는지 정의한다.

## 관련 문서

- [API DDD 컨벤션](./ddd.md): API bounded context, implementation module, domain model 규칙.
- [API Source Dependency 컨벤션](./source-dependency.md): import direction, layer boundary, framework dependency 규칙.
- [API Runtime Wiring 컨벤션](./runtime-wiring.md): NestJS DI, module composition, provider registration, port binding 규칙.

## Source 구조

API source map은 module-first 구조를 사용한다:

```text
src/
  main.ts
  api.module.ts
  {module}/
    {module}.module.ts
    domain/
    application/
    infrastructure/
    presentation/
```

`{module}` 자리에는 구체적인 module name을 사용한다.
각 module directory는 implementation module이며 별도의 bounded context가 아니다.
각 module layer 내부 subdirectory는 feature, adapter type, framework need에 따라 달라질 수 있다.

해당 module에 그 layer에 속한 code가 있을 때만 layer directory를 만든다.
형태를 채우기 위한 빈 layer folder는 만들지 않는다.

## 아키텍처 기본값

- API는 하나의 bounded context로 본다.
- 현재 API 구조에는 `contexts/` 또는 `shared-kernel/`을 만들지 않는다.
- Source file은 layer보다 먼저 `src/{module}/` 아래에 그룹화한다.
- 하나의 deployable API를 사용한다.
- Domain code는 NestJS, transport, persistence, external SDK detail에서 독립적으로 유지한다.
- API bootstrap code, `api.module.ts`, implementation module에서는 NestJS module과 provider wiring을 허용한다.
- Presentation, infrastructure, pragmatic application service에서는 local complexity를 줄일 수 있다면 NestJS decorator와 DI를 허용한다.
- Framework convenience를 이유로 domain object가 framework API에 의존하게 만들지 않는다.

## Directory 읽기 규칙

- Dependency boundary를 식별한다: domain, application, infrastructure, presentation, runtime wiring.
- `src/{module}/` directory가 source file을 묶거나 NestJS module을 가진다는 이유만으로 bounded context로 읽지 않는다.
- Import direction은 source dependency 규칙을 사용한다.
- Provider composition과 object creation은 runtime wiring 규칙을 사용한다.
