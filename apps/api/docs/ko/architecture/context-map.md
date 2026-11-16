---
title: 컨텍스트 맵
applies_to:
  - apps/api의 bounded context 책임과 context 사이의 의존 관계
read_when:
  - 새 개념이나 기능을 어느 bounded context에 둘지 정할 때
  - 한 bounded context에서 다른 bounded context를 참조하려 할 때
related:
  - ./context-integration.md
---

# 컨텍스트 맵

## Bounded context
- `library` (핵심): source, sync job, post, post 검색
  - 사용자가 보는 모든 개념과 동기화 클라이언트와의 계약을 소유함
- `ingestion` (지원): 본문의 청크 분할, 임베딩과 저장, 검색 질의 임베딩
  - source, post, 동기화 클라이언트를 모름. 본문을 임베딩으로 바꾸는 능력만 제공함
  - 임베딩 품질을 정하는 결정은 `ingestion`에 둠

## 의존 관계
- 다른 bounded context의 aggregate는 식별자로만 참조함
- `library`는 `ingestion`에서 필요한 값을 조회함(Pull)
- `ingestion`은 `library`를 import하지 않고 integration event로만 주고받음(Push)
  - `ingestion`이 `library`를 알면 `library`의 변경이 임베딩 처리까지 번짐
- 의존 방향을 바꾸면 이 문서와 dependency-cruiser 규칙을 함께 고침
