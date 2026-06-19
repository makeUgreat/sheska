---
title: API 컨벤션 인덱스
lang: ko
audience: both
applies_to:
  - apps/api
source: ../en/index.md
last_synced: 2026-06-19
related:
  - ./architecture.md
  - ./ddd.md
  - ./source-dependency.md
  - ./runtime-wiring.md
  - ./test.md
---

# API 컨벤션 인덱스

## 동기화 정책

영어와 한글 `apps/api` convention 문서는 같은 정책을 설명하는 쌍 문서다.
두 문서가 충돌하면 영어와 한글 중 의도한 정책을 선택하고 같은 변경 단위에서 양쪽 문서를 모두 수정한다.

## 읽기 규칙

현재 작업과 관련 있는 `apps/api` convention 문서만 읽는다.
공개 project Markdown 문서를 변경할 때는 repository documentation convention index도 함께 읽는다.

## 라우팅

- `apps/api` architecture, DDD boundary, source structure, module boundary 결정 작업: [API 아키텍처 컨벤션](./architecture.md)을 읽는다.
- `apps/api` DDD boundary, domain model ownership, shared domain language 작업: [API DDD 컨벤션](./ddd.md)을 읽는다.
- Import direction, layer boundary, framework import 작업: [API Source Dependency 컨벤션](./source-dependency.md)을 읽는다.
- NestJS DI, provider registration, module wiring, platform startup flow, port binding 작업: [API Runtime Wiring 컨벤션](./runtime-wiring.md)을 읽는다.
- `apps/api` test file, test structure, test command 선택 작업: [API 테스트 컨벤션](./test.md)을 읽는다.
