---
title: API DDD 컨벤션
lang: ko
audience: both
applies_to:
  - apps/api
source: ../en/ddd.md
last_synced: 2026-06-19
related:
  - ./architecture.md
  - ./index.md
---

# API DDD 컨벤션

이 API에서 DDD 용어는 model ownership, language boundary, business behavior를 정의하기 위해 사용한다.
DDD 용어는 단순한 folder name이 아니다.

## API Bounded Context

- 이 API는 하나의 bounded context를 가진다.
- 추가 bounded context folder를 만들지 않는다.
- NestJS module 또는 feature folder는 자동으로 bounded context가 아니다.

## Bounded Context 정의

- bounded context는 특정 domain model과 ubiquitous language가 유효한 경계다.
- bounded context 외부 코드는 context 내부 model을 직접 수정해서는 안 된다.
- bounded context 외부 코드는 context 내부 domain object에 의존하지 않는 것이 좋다.
- bounded context는 folder name만이 아니라 model, language, responsibility boundary로 정의된다.

## Implementation Modules

- implementation module은 실용적인 source grouping, code wiring 또는 framework module 단위다.
- Source file은 `src/{module}/` 아래 implementation module 기준으로 묶는다.
- implementation module은 자동으로 DDD bounded context가 아니다.
- Implementation module name은 단일 API bounded context 내부의 business capability 또는 runtime ownership을 설명해야 한다.

## Domain Model Building Blocks

- Aggregate는 consistency boundary를 보호하고 aggregate root를 통해 behavior를 노출한다.
- Entity는 identity와 lifecycle을 가진다.
- Value object는 immutable domain value를 표현하고 자신의 invariant를 검증한다.
- Repository가 domain layer에 속하는 경우 database implementation detail이 아니라 domain persistence need를 contract로 표현한다.
- Domain service는 하나의 entity 또는 value object에 자연스럽게 속하지 않는 business rule을 담는다.
- Domain event는 이미 발생한 의미 있는 business fact를 설명한다.
- Domain error는 business rule failure를 설명하며 transport, database, framework detail을 포함하지 않아야 한다.

## 리뷰 규칙

- domain object가 database row 또는 request DTO처럼 동작하지 않고 business behavior를 표현하는지 확인한다.
- `src/{module}/` implementation module을 domain model boundary로 오해하고 있지 않은지 확인한다.
