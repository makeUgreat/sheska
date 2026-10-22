---
title: 루트 컨벤션 인덱스
applies_to:
  - repository
related:
  - ./documentation-guidelines.md
  - ./domain-document-guidelines.md
  - ./monorepo.md
---

# 루트 컨벤션 인덱스

## 읽기 규칙

현재 작업과 관련된 문서만 읽는다.
기본적으로 모든 문서를 읽지 않는다.

## 라우팅

- 도메인 용어의 의미를 확인하거나, 도메인 규칙에 닿는 기능을 설계·구현·변경할 때:
  해당 bounded context의 도메인 문서를 읽는다. 용어의 정의는 [용어집](./domain/glossary.md)에 있다.
  - [Library 도메인](./domain/library.md): source 동기화, sync job, post 발행과 검색, 본문 문법
  - [Ingestion 도메인](./domain/ingestion.md): 청크, 임베딩 모델, 임베딩 저장과 교체
- 문서를 생성, 수정, 리뷰할 때: [문서 작성 가이드라인](./documentation-guidelines.md)을 읽는다.
- 도메인 용어나 도메인 규칙을 쓰거나 고칠 때: [도메인 문서 작성 가이드라인](./domain-document-guidelines.md)을 읽는다.
- workspace layout, 루트 package script, 저장소 단위 명령어, static harness 동작을 변경할 때: [모노레포 정책](./monorepo.md)을 읽는다.
- 환경 변수, env 파일, 비밀값을 추가하거나 바꾸거나, 환경마다 다르게 동작해야 하는 기능을 만들거나,
  이전 코드와 호환되지 않는 스키마 변경을 배포할 때: [실행 환경](./environments.md)을 읽는다.
- 개발 또는 테스트 중 외부 도구를 사용할 때(Playwright MCP, Obsidian MCP, Obsidian Local REST API): [개발 통합 도구](./dev-integrations.md)를 읽는다.

## 유지보수

이 인덱스는 짧게 유지한다.
명확한 작업 trigger가 있는 루트 컨벤션 문서만 라우팅한다.
