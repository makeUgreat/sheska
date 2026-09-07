---
title: API 컨벤션 인덱스
lang: ko
audience: both
applies_to:
  - apps/api
source: ../en/index.md
last_synced: 2026-09-07
related:
  - ./operability/error.md
  - ./operability/logging.md
  - ./architecture/architecture.md
  - ./architecture/ddd.md
  - ./persistence/persistence.md
  - ./architecture/infrastructure.md
  - ./architecture/source-dependency.md
  - ./architecture/runtime-wiring.md
  - ./architecture/context-integration.md
  - ./test.md
  - ./persistence/repository-methods.md
  - ./operability/observability.md
  - ./operability/fault-tolerance/index.md
---

# API 컨벤션 인덱스

## 동기화 정책

영어와 한글 `apps/api` convention 문서는 같은 정책을 설명하는 쌍 문서다.
두 문서가 충돌하면 영어와 한글 중 의도한 정책을 선택하고 같은 변경 단위에서 양쪽 문서를 모두 수정한다.

## 읽기 규칙

현재 작업과 관련 있는 `apps/api` convention 문서만 읽는다.
공개 project Markdown 문서를 변경할 때는 repository documentation convention index도 함께 읽는다.

## 라우팅

### Architecture

- `apps/api` architecture, DDD boundary, source structure, module boundary 결정 작업: [API 아키텍처 컨벤션](./architecture/architecture.md)을 읽는다.
- `apps/api` DDD boundary, domain model ownership, shared domain language 작업: [API DDD 컨벤션](./architecture/ddd.md)을 읽는다.
- Infrastructure adapter file 명명, 디렉토리 구조, adapter 컨벤션 작업: [API Infrastructure 컨벤션](./architecture/infrastructure.md)을 읽는다.
- Import direction, layer boundary, framework import 작업: [API Source Dependency 컨벤션](./architecture/source-dependency.md)을 읽는다.
- NestJS DI, provider registration, module wiring, platform startup flow, port binding 작업: [API Runtime Wiring 컨벤션](./architecture/runtime-wiring.md)을 읽는다.
- 크로스 컨텍스트 데이터 통합, 컨슈머 소유 포트/어댑터 배치, Pull vs Push 전략 결정 작업: [API 컨텍스트 통합 컨벤션](./architecture/context-integration.md)을 읽는다.

### Operability

- API error, exception, masking, propagation, error response contract review 작업: [API 오류 정책](./operability/error.md)을 읽는다.
- 로그 여부 결정, 로그 레벨, 어디서 로그를 남길지, 장애 로그 정책 작업: [API 로깅 정책](./operability/logging.md)을 읽는다.
- OpenTelemetry 계측, trace/log/metric export 배선, 리소스 속성 결정: [API 옵저버빌리티 컨벤션](./operability/observability.md)을 읽는다.
- 외부 의존성에 대한 retry, timeout/deadline, circuit breaker, 그 외 fault-tolerance 정책 결정: [API Fault Tolerance 인덱스](./operability/fault-tolerance/index.md)를 읽는다.

### Persistence

- Database schema, migration, ORM persistence, repository mapper, storage constraint 결정 작업: [API Persistence 정책](./persistence/persistence.md)을 읽는다.
- Repository method 호출 지점 결정 (`get` vs `find`, `save` vs `insert`/`update`): [Repository Method 사용 가이드](./persistence/repository-methods.md)를 읽는다.

### Test

- `apps/api` test file, test structure, test command 선택 작업: [API 테스트 컨벤션](./test.md)을 읽는다.
