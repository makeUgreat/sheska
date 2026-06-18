---
title: API Runtime Wiring 컨벤션
lang: ko
audience: both
applies_to:
  - apps/api
source: ../en/runtime-wiring.md
last_synced: 2026-06-19
related:
  - ./architecture.md
  - ./source-dependency.md
---

# API Runtime Wiring 컨벤션

Runtime wiring rule은 object가 어디서 생성되고 implementation이 어떻게 연결되는지 판단한다.
Runtime wiring은 module composition과 provider binding을 설명하며 source import permission을 의미하지 않는다.

## Wiring Boundary

- `src/main.ts`는 얇은 process entrypoint로 유지한다.
- `api.module.ts`는 API root module이다.
- `api.module.ts`는 application, presentation, infrastructure provider를 조립할 수 있다.
- `src/{module}/{module}.module.ts` file은 optional runtime wiring module이며 bounded context가 아니다.
- 모든 use case folder를 NestJS module로 그대로 반영하기보다 runtime boundary 또는 feature 기준으로 provider를 조립하는 것을 선호한다.

## NestJS DI

- NestJS DI는 root module, implementation module, presentation adapter, infrastructure adapter, pragmatic application service의 runtime wiring에 사용할 수 있다.
- NestJS DI가 domain code에서 NestJS로 향하는 source dependency를 만들어서는 안 된다.
- Outer implementation이 inner contract를 만족해야 할 때는 provider factory 또는 explicit provider를 사용한다.
- Business rule을 NestJS module, provider factory, bootstrap function으로 옮기지 않는다.
- Provider registration은 선택을 소유한 runtime boundary 가까이에 둔다.

## Port Binding

- 이 convention에서 port는 outer implementation을 stable interface를 통해 교체, 격리, 테스트해야 할 때 사용하는 application-owned boundary contract를 뜻한다.
- 모든 dependency에 기본적으로 port를 만들지 않는다.
- Runtime wiring은 application code가 infrastructure implementation을 import하지 않게 유지하면서 infrastructure implementation을 application port에 연결할 수 있다.
- Infrastructure adapter는 application-owned port를 구현할 수 있다.
- Presentation DTO, domain error, application error, persistence mapper는 contract이지만 기본적으로 port는 아니다.

## Configuration

- Environment variable definition은 그 값을 사용하는 boundary 가까이에 둔다.
- Runtime wiring은 startup 시 environment selection과 app-level validation을 aggregate할 수 있다.
- Adapter-specific required environment variable은 selected adapter 또는 config factory가 검증하는 것이 좋다.
- Production code는 여러 곳에서 `process.env`를 직접 읽기보다 validated config value를 소비하는 것이 좋다.

## 리뷰 규칙

- Runtime wiring이 금지된 source import를 만들지 않는지 확인한다.
- NestJS module이 business rule을 담는 것이 아니라 behavior를 조립하는지 확인한다.
- Port는 substitution, isolation, boundary clarity에 유용할 때만 도입하는지 확인한다.
- Configuration ownership이 그 값을 사용하는 runtime boundary를 따르는지 확인한다.
