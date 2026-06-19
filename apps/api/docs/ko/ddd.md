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
---

# API DDD 컨벤션

이 API에서 DDD 용어는 model ownership, language boundary, business behavior를 정의하기 위해 사용한다.
DDD 용어는 단순한 folder name이 아니다.

## Bounded Context

- Bounded context는 특정 domain model과 ubiquitous language가 유효한 경계다.
- 같은 단어라도 다른 bounded context에서는 다른 의미를 가질 수 있다.
- bounded context 외부 코드는 context 내부 model을 직접 수정해서는 안 된다.
- bounded context 외부 코드는 context 내부 domain object에 의존하지 않는 것이 좋다.
- Context는 ID, DTO, event, port, anti-corruption layer를 통해 통신한다.
- bounded context는 folder name만이 아니라 model, language, responsibility boundary로 정의된다.

## Implementation Modules

- implementation module은 실용적인 code wiring 또는 framework module 단위다.
- implementation module은 자동으로 DDD bounded context가 아니다.
- 다른 bounded context는 internal domain object에 접근하기보다 public application contract, ID, DTO, event, port를 통해 상호작용하는 것이 좋다.

## Domain Kernel

- `kernels/domain`은 context domain layer가 공유하는 domain-layer kernel code를 담는다.
- Domain-kernel code는 stable domain-layer policy와 여러 bounded context가 의도적으로 공유하는 stable domain concept를 포함할 수 있다.
- Domain-kernel code가 shared domain concept를 모델링한다면 business meaning을 가진다.
- Shared domain concept 변경은 영향을 받는 context owner와 함께 review한다.
- `kernels/domain`을 generic duplication-removal directory로 사용해서는 안 된다.
- 공유 concept가 불안정하거나 context-specific이라면 premature domain-kernel code보다 duplication을 선호한다.
- `Money`, `Currency`, `DateRange`처럼 작고 안정적인 domain concept에는 `kernels/domain`을 선호한다.
- 여러 bounded context가 안정적인 domain concept를 의도적으로 공유하기 전에는 shared domain concept code를 만들지 않는다.

## Domain Model Building Blocks

- Aggregate는 consistency boundary를 보호하고 aggregate root를 통해 behavior를 노출한다.
- Entity는 identity와 lifecycle을 가진다.
- Value object는 immutable domain value를 표현하고 자신의 invariant를 검증한다.
- Repository가 domain layer에 속하는 경우 database implementation detail이 아니라 domain persistence need를 contract로 표현한다.
- Domain service는 하나의 entity 또는 value object에 자연스럽게 속하지 않는 business rule을 담는다.
- Domain event는 이미 발생한 의미 있는 business fact를 설명한다.
- Domain error는 business rule failure를 설명하며 transport, database, framework detail을 포함하지 않아야 한다.

## 리뷰 규칙

- 새로운 shared abstraction이 정말 안정적인 domain concept인지 확인한 뒤 domain-kernel code로 만든다.
- Bounded context의 public language가 다른 context의 internal model을 누출하고 있지 않은지 확인한다.
- domain object가 database row 또는 request DTO처럼 동작하지 않고 business behavior를 표현하는지 확인한다.
- Model boundary를 넘는 통신이 ID, DTO, event, port, anti-corruption mapping을 사용하는지 확인한다.
