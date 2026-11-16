---
title: API Source Dependency 컨벤션
applies_to:
  - apps/api
read_when:
  - 새 코드를 어느 소스 영역에 둘지 정할 때
  - import 방향, path alias, public surface, kernel 승격을 정할 때
  - dependency-cruiser 위반 메시지가 이 문서를 가리킬 때
related:
  - ./runtime-wiring.md
---

# API Source Dependency 컨벤션

## Source Area
- 의존은 바깥(presentation, infrastructure, acl)에서 application, domain, core 쪽으로만 향함. 개별 규칙은 dependency-cruiser가 강제함

| 영역 | 책임 |
|---|---|
| `core` | 비즈니스 용어가 없는 순수 primitive |
| `domain` | 비즈니스 규칙과 도메인 모델 |
| `application` | use case와 port |
| `presentation` | application 호출을 시작하는 driving adapter |
| `infrastructure` | port를 구현하는 driven adapter |
| `acl` | 다른 컨텍스트로 나가는 port의 구현 |
| `kernels` | 여러 컨텍스트가 공유하는 계약과 구현 |
| `platform` | 시작과 runtime 배선 |

- presentation과 infrastructure는 기술이 아니라 방향으로 나눔
- domain과 application은 I/O와 framework에 의존하지 않음. 규칙만 따로 테스트할 수 있어야 함
- 계약은 패턴이 아니라 제공하는 기능으로 이름 지음. `Port` 접미사를 쓰지 않음

## 외부 모듈
- 도메인은 결정적이고 부수효과가 없는 외부 모듈만 씀. 비결정적인 식별자 생성은 예외임
- 외부 모듈은 `core`의 얇은 래퍼에서만 import함. 허용 범위가 래퍼로 모여 도메인 규칙을 넓히지 않아도 됨

## Import Path
- alias는 경로를 줄이는 수단이 아니라 경계의 이름임. 경계마다 하나만 두고 넓은 alias는 두지 않음

## Public Surface
- `index.ts`는 다른 영역이 실제로 import해야 하는 계약만 내보냄

## Kernel
- 여러 컨텍스트가 실제로 재사용할 때만 kernel로 올림. 불안정한 공유 개념은 중복을 허용함
- kernel을 컨텍스트 통합 창구나 일반 유틸리티 모음으로 쓰지 않음
- kernel의 application, domain 계약은 기술 중립임
