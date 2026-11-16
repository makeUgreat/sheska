---
title: API 컨텍스트 통합 컨벤션
applies_to:
  - apps/api
read_when:
  - 한 bounded context가 다른 bounded context의 데이터나 동작을 필요로 할 때
  - domain event, integration event, outbox를 정하거나 바꿀 때
related:
  - ./context-map.md
  - ./ddd.md
  - ./source-dependency.md
---

# API 컨텍스트 통합 컨벤션

## 이벤트
- 이벤트 종류는 전달 채널이 아니라 소유권으로 정함
  - 한 bounded context 안에서 만들고 소비하는 사실은 domain event임
  - bounded context 경계를 넘는 사실은 같은 process 안이라도 integration event임
  - 비동기로 보내거나 저장한다는 이유만으로 domain event를 integration event로 바꾸지 않음
- 현재 use case를 끝내는 데 꼭 필요한 다음 동작은 이벤트가 아니라 명시적인 호출로 함. 이벤트는 떼어 낼 수 있는 반응에만 씀
- domain event 클래스를 컨텍스트 사이의 계약으로 노출하지 않음. 경계를 넘을 때 integration event로 바꿈
- integration event는 원시 데이터 payload만 담음. aggregate, value object, 전송 기술 객체를 노출하지 않음
- 받은 integration event는 신뢰할 수 없는 입력임
  - consumer가 type, version, payload를 검증한 뒤 application을 호출함
  - 직렬화를 거치면 클래스 정체성이 사라짐. producer의 클래스나 `instanceof`에 기대지 않고, producer의 상수를 import하지 않음

## Outbox
- outbox는 이벤트 종류가 아니라 integration event를 잃지 않고 보내는 방법임
- outbox를 쓸지는 같은 process인지가 아니라 내구성과 원자성이 필요한지로 정함
  - 커밋된 DB 변경이 반드시 일으켜야 하는 후속 반응이고, 유실을 허용할 수 없고, 재시작 뒤 재시도가 필요하면 outbox를 씀
  - 이때 event는 그 DB 변경을 커밋하는 트랜잭션에서 outbox에 저장함
  - 유실을 허용하는 best-effort 알림에는 outbox를 쓰지 않음
- outbox relay는 설정된 dispatcher가 event를 받아들인 뒤에만 published로 표시함. 재시도는 [Fault Tolerance 정책](../operability/fault-tolerance.md#outbox-relay)을 따름

## Pull과 Push
- 다른 컨텍스트의 데이터는 consumer가 소유한 port로 요청할 때 조회함(Pull). 이것이 기본임
- 아래 경우에만 producer의 event로 consumer 쪽 read model을 만듦(Push)
  - producer의 장애나 지연이 consumer 응답을 자주 떨어뜨린다고 확인된 경우
  - 두 컨텍스트가 다른 process나 DB로 나뉘는 경우
- Pull은 두 컨텍스트가 같은 순간에 살아 있어야 하고, Push는 최종적 일관성과 projection 관리를 떠안음. 둘 다 결합을 없애지 않고 옮길 뿐임
- port 계약을 공통 모듈에 두지 않음. 공통 모듈이 두 컨텍스트를 묶는 숨은 허브가 되고, 가상의 소비자를 위해 계약이 넓어짐

## 구현 규칙
- port는 consumer가 소유함. 위치는 `contexts/A/application/ports/`임
  - A의 도메인 언어로 이름 짓고, A가 실제로 쓰는 메서드만 두고, A의 타입을 반환함
  - 이름은 빌려 온 패턴 단어(`Service`, `Gateway`)가 아니라 제공하는 기능으로 지음. 조회는 `<Concept>Lookup`, 동작은 동사형 이름임. 예: `SourceEmbeddingLookup`, `SearchQueryEmbedder`
- adapter는 consumer의 ACL에 둠. 위치는 `contexts/A/acl/<B>/`이고 이름은 `<concept>.from-<B>.<role>.ts`임
  - ACL은 `infrastructure/`와 다른 레이어임. 컨텍스트 경계를 넘는 것은 기술에 접근하는 것과 다른 종류의 외부 의존임
  - adapter는 B의 application port에만 바인딩함. B의 domain repository나 도메인 소유 계약에는 바인딩하지 않음
  - B에 맞는 application port가 없으면 B가 port를 새로 만듦. A가 B의 도메인 계약에 직접 닿지 않음
  - adapter는 B의 결과를 A의 언어로 번역함. 예: B의 `Embedder`는 실패하면 예외를 던지지만, A의 `SearchQueryEmbedder`는 `null`을 돌려주고 검색은 FTS만으로 성립함
- A에서 B를 import할 수 있는 곳은 ACL adapter와 A의 모듈 배선뿐이고, 대상은 B의 `index.ts`뿐임
- B의 `index.ts`는 application port와 그 DI token만 내보냄. domain 계약은 B 안에서 다시 내보내더라도 `index.ts`에 넣지 않음
- 양쪽 port가 같은 개념이라 이름이 같아지면, 두 이름을 함께 보는 파일에서만 import alias를 씀. 반환 타입은 모양이 같아도 이름을 따로 둠
- 여러 출처의 데이터를 조합하는 일은 controller가 아니라 use case가 함

## 읽기 모델의 크로스 컨텍스트 SQL 예외
- 읽기 전용 query adapter는 다른 컨텍스트의 테이블을 SQL로 직접 읽을 수 있음. 쓰기는 어떤 경우에도 허용하지 않음
- 이 예외는 순위나 집계를 한 쿼리 안에서 계산해야 해서 port로 나눌 수 없을 때만 씀
  - 지금 해당하는 것은 `library`의 post 검색 하나임. FTS 점수와 임베딩 거리를 RRF로 합치려면 `ingestion`의 `source_embeddings`를 같은 쿼리에서 조인해야 함
  - port로 나누면 후보를 메모리로 가져와 다시 순위를 매겨야 하고, 순위 품질과 페이지네이션이 함께 깨짐
- 정적 검사는 이 예외를 잡지 못함. SQL은 문자열이라 dependency-cruiser도 타입 검사도 테이블 참조를 보지 못함
  - producer의 테이블이나 컬럼을 바꾸는 변경에서 이 쿼리를 함께 확인함
  - 예외를 늘리면 조건을 만족하는지 확인하고 이 섹션에 어느 쿼리인지 적음
