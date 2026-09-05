---
title: Obsidian 플러그인 컨벤션 인덱스
lang: ko
audience: both
applies_to:
  - apps/obsidian-plugin
source: ../en/index.md
last_synced: 2026-09-05
related:
  - ./adr/0001-source-sync-local-cache.md
---

# Obsidian 플러그인 컨벤션 인덱스

## 동기화 정책

`apps/obsidian-plugin`의 영/한 컨벤션 문서는 같은 정책을 설명하는 페어 문서다.
서로 충돌하면 어느 한쪽에서 의도한 정책을 선택해 같은 변경 단위 안에서 양쪽 문서를 함께 갱신한다.

## 읽기 규칙

현재 작업과 관련된 `apps/obsidian-plugin` 문서만 읽는다.
공개 프로젝트 마크다운 문서를 변경할 때는 레포지토리 문서 컨벤션 인덱스도 함께 읽는다.

## Architecture Decision Records

이 플러그인의 durable한 설계 결정은 `adr/` 아래에 ADR로 기록한다. ADR 번호 규칙과 작성 스타일은 루트 [ADR 작성 가이드](../../../../docs/ko/adr.md) 참고.

- 로컬 동기화 변경 감지, 자동 동기화 캐시 무효화, 삭제 감지 부트스트랩 관련: [ADR 0001: 소스 자동 동기화를 위한 로컬 mtime 캐시](./adr/0001-source-sync-local-cache.md) 참고.