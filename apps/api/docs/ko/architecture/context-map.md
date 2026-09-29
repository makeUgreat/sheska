---
title: 컨텍스트 맵
applies_to:
  - apps/api의 bounded context 책임과 context 사이의 의존 관계
read_when:
  - 새 개념이나 기능을 어느 bounded context에 둘지 정할 때
  - 한 bounded context에서 다른 bounded context를 참조하려 할 때
related:
  - ./ddd.md
  - ./context-integration.md
---

# 컨텍스트 맵

## Bounded context 목록

- 이 문서는 각 bounded context가 무엇을 소유하는지만 정한다.
  - 용어와 도메인 규칙은 [`docs/ko/domain/`](../../../../../docs/ko/domain)에 있다.
- `library` (핵심): source, sync job, post, note 조회, post 검색
  - 사용자가 보는 모든 개념과 동기화 클라이언트와의 계약을 소유한다.
  - note는 source를 읽는 이름이므로 별도 context나 aggregate로 나누지 않는다.
  - post 검색의 순위 규칙은 `library`가 소유한다. 의미 검색에 쓰는 벡터만 `ingestion`에서 가져온다.
- `ingestion` (지원): 본문을 청크로 나누고 임베딩해서 저장하는 일, 검색 질의의 임베딩
  - source, post, 동기화 클라이언트를 알지 않는다. 받은 본문을 임베딩으로 바꾸는 능력만 제공한다.
  - 임베딩 모델과 청크 크기처럼 임베딩 품질을 정하는 결정은 `ingestion`에 둔다.

## 의존 관계

- 다른 bounded context의 aggregate는 식별자로만 참조한다.
- `library` → `ingestion`: `library`가 필요한 값을 조회한다(Pull).
  - source 임베딩 메타데이터, 임베딩 진행 상황, 검색 질의 임베딩
  - `library`의 port와 ACL adapter가 `ingestion`의 공개 API를 번역한다.
- `ingestion` → `library`: `ingestion`은 `library`를 import하지 않는다. integration event로만 주고받는다(Push).
  - `library`가 sync job을 만들면 `ingestion`이 받아 임베딩 workflow를 시작한다.
  - `ingestion`은 workflow의 완료와 실패를 알리고, `library`가 sync job 상태에 반영한다.
  - `ingestion`이 `library`를 알게 되면 `library`의 변경이 임베딩 처리에까지 번진다.
- 읽기 모델의 cross-context SQL 예외는 post 검색 하나다.
  - 조건과 이유는 [context integration 컨벤션](./context-integration.md#읽기-모델의-크로스-컨텍스트-sql-예외)에 있다.
- 의존 방향을 바꾸면 같은 변경에서 이 문서와 dependency-cruiser 규칙을 함께 갱신한다.
