---
title: API 영속성 정책
applies_to:
  - apps/api
read_when:
  - DB schema, migration, repository, query port, mapper를 바꿀 때
  - 호출부에서 repository나 query port 메서드를 고를 때
related:
  - ../architecture/ddd.md
---

# API 영속성 정책

## 데이터베이스 제약
- 규칙을 DB에 둘지는 동시 쓰기에서 애플리케이션이 보장할 수 있는지로 정함
  - 유일성은 DB만 보장함. 행 하나만 보고 판단하는 규칙은 도메인 객체가 이미 보장함
- 도메인 검증을 `CHECK`, PG enum, trigger로 다시 구현하지 않음. 고칠 곳만 둘로 늘어남

## 검색 벡터 열
- 검색 벡터는 색인 대상과 같은 테이블의 generated column으로 둠. 애플리케이션이나 다른 테이블의 trigger가 쓰지 않음

## Mapper
- DB 행은 도메인의 복원 API로 객체를 만들고, 복원 중 생긴 도메인 exception은 그대로 전파함
- 쓰기 메서드가 돌려주는 객체는 DB가 돌려준 행으로 복원함

## Repository 메서드
- 부재가 예상 가능한 분기면 `find`(없으면 `null`), 반드시 있어야 하면 `get`(없으면 예외)을 씀
- 조회 조건은 객체로 받고 필드를 메서드 이름에 넣지 않음. 필드 조합마다 메서드가 생기지 않고 인자 순서 실수가 사라짐
- 쓰기 메서드 이름은 충돌할 때의 동작을 말함(`insert`, `update`, `upsert`). `save`는 쓰지 않음
  - `upsert`는 멱등성이 요구사항일 때만 쓰고, 덮어쓰는 field를 계약에 적음
- 여러 aggregate에 걸친 유일성은 사전 조회가 아니라 DB 제약으로 강제함. 사전 조회는 동시성 아래에서 예측일 뿐임

## Repository와 Query Port
- 도메인 동작이 필요하면 repository, 보여 줄 projection만 필요하면 query port를 씀
- repository는 한 aggregate 안의 테이블만 join함. query port는 경계를 넘어 join할 수 있음

## Raw SQL
- raw SQL은 첫 verb와 다음 token을 한 줄에 둠. 줄을 바꾸면 같은 연산이 다른 telemetry label로 쪼개짐
