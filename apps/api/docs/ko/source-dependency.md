---
title: API Source Dependency 컨벤션
lang: ko
audience: both
applies_to:
  - apps/api
source: ../en/source-dependency.md
last_synced: 2026-06-19
related:
  - ./architecture.md
  - ./runtime-wiring.md
---

# API Source Dependency 컨벤션

Source dependency rule은 source file이 무엇을 import할 수 있는지 판단한다.
Runtime wiring은 object를 더 유연하게 연결할 수 있지만 source dependency rule을 약화해서는 안 된다.

## Source Direction

각 `src/{module}/` implementation module 내부의 기본 source direction은 다음과 같다:

```text
presentation -> application -> domain
infrastructure -> application -> domain
```

- Domain code는 application, infrastructure, presentation, bootstrap, NestJS, database, HTTP, SDK, 다른 framework detail에 의존하지 않는다.
- Application code는 domain code에 의존할 수 있다.
- Presentation code는 application code와 protocol/framework library에 의존할 수 있다.
- Infrastructure code는 adapter 구현 시 application contract, domain code, external library, framework library에 의존할 수 있다.
- `api.module.ts`와 implementation module은 runtime provider를 조립하기 위해 application, presentation, infrastructure code에 의존할 수 있다.

Cross-module source import는 application-level contract 또는 use case를 우선한다.
다른 module의 internal state 또는 validation을 재사용하기 위한 목적으로 domain object를 import하지 않는다.
두 module이 같은 domain language를 필요로 한다면 shared code를 추출하기 전에 behavior가 한 module에 속해야 하는지 다시 검토한다.

## Framework Dependency 정책

- Domain code는 NestJS decorator, NestJS DI API, transport DTO, persistence client, external SDK client를 import해서는 안 된다.
- Application code는 framework 지식 없이도 use case flow와 contract를 이해할 수 있게 유지하는 것이 좋다.
- Application code는 이를 피하는 것이 가치보다 더 큰 indirection을 만든다면 NestJS decorator 또는 DI를 사용할 수 있다.
- Presentation과 infrastructure code는 NestJS와 protocol 또는 adapter library를 직접 사용할 수 있다.
- NestJS provider registration을 쉽게 만들기 위해 금지된 domain dependency를 추가하지 않는다.

## Import Path 정책

- 같은 local implementation area 내부에서는 relative import를 선호한다.
- 기본적으로 `index.ts` barrel file을 만들지 않는다.
- 같은 app 내부에서는 구체적인 file에서 직접 import하는 것을 선호한다.
- Directory가 안정적인 public API boundary로 의도적으로 관리될 때만 `index.ts`를 사용한다.
- Import path를 짧게 만들기 위한 목적만으로 `index.ts`를 사용하지 않는다.
- `@api/*`, `@src/*`, `@/*` 같은 broad alias는 피한다.
- 가까운 relative import를 줄이기 위한 목적만으로 path alias를 추가하지 않는다.

## Layer 책임

- `src/{module}/domain`은 entity, value object, aggregate, domain service, domain event, domain error, business invariant를 담는다.
- `src/{module}/application`은 use case, application service, command/query handler, application error, transaction boundary, 필요한 경우 application-owned port를 담는다.
- `src/{module}/infrastructure`는 database, ORM, external API, file system, message broker, SDK, persistence adapter code를 담는다.
- `src/{module}/presentation`은 controller, resolver, request DTO, response DTO, protocol mapper, guard, pipe, HTTP error mapping을 담는다.
- Shared kernel은 현재 API 구조에 포함하지 않는다.

## 리뷰 규칙

- Domain code가 framework와 adapter detail에서 자유로운지 확인한다.
- Application code가 presentation DTO 또는 infrastructure implementation에 의존하지 않는지 확인한다.
- Shared abstraction이 general utility bucket이 아니라 stable boundary인지 확인한다.
