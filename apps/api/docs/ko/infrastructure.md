---
title: API Infrastructure 컨벤션
lang: ko
audience: both
applies_to:
  - apps/api
source: ../en/infrastructure.md
last_synced: 2026-07-20
related:
  - ./architecture.md
  - ./persistence.md
  - ./source-dependency.md
---

# API Infrastructure 컨벤션

이 문서는 infrastructure adapter code의 명명 및 구조 컨벤션을 정의한다.
Persistence 관련 규칙은 [API Persistence 정책](./persistence.md)에 있다.

## 적용 범위

- Application contract file 또는 infrastructure adapter file을 명명하거나 배치하거나 구조를 잡을 때 이 문서를 사용한다.
- Database schema, ORM, migration, repository mapper, storage constraint 규칙은 persistence 정책을 사용한다.
- Import direction, layer boundary 규칙은 source dependency 컨벤션을 사용한다.

## Contract 파일 명명

Application contract file(포트를 정의하는 인터페이스 — repository 계약, query 포트, lookup 포트 등)은 다음 패턴을 따른다:

```
{domain-name}.{semantic-role}.ts
```

- **domain-name**: 계약이 대상으로 하는 aggregate, entity, 또는 개념 (예: `post`, `source`)
- **semantic-role**: 계약이 **하는 일**을 domain 또는 기술 용어로 표현한다 (예: `query`, `lookup`, `repository`). 여기에 `port`는 사용하지 않는다 — `port`는 계약의 목적이 아니라 아키텍처 패턴 명칭이다.

예시:

| 파일 | 인터페이스 |
| --- | --- |
| `post.query.ts` | `PostQuery` |
| `source.query.ts` | `SourceQuery` |
| `source.lookup.ts` | `SourceLookup` |
| `embedder.ts` | `Embedder` (개념과 역할이 같은 단어인 경우) |

`.port.ts` suffix는 **허용하지 않는다**. 파일명에 헥사고날 아키텍처 용어 "port"를 포함시키는 것으로, role이 이미 전달하는 정보 외에 아무것도 추가하지 않는다.

## Adapter 파일 명명

Infrastructure adapter file name은 다음 패턴을 따른다:

```
{domain-name}.{adapter-or-purpose}.{role}.ts
```

- **domain-name**: adapter가 담당하는 aggregate, entity, 또는 port 개념 (예: `source`, `embed-job`)
- **adapter-or-purpose**: 기술 또는 adapter category (예: `drizzle`, `bullmq`, `persistence`, `fingerprinter`)
- **role**: file이 담당하는 architectural 역할 (예: `repository`, `dispatcher`, `mapper`, `consumer`)

이 순서는 subject, boundary, role을 정렬하고 검색하기 쉽게 둔다.

예시:

| 파일 | 클래스 |
| --- | --- |
| `source.pg-drizzle.repository.ts` | `SourcePgDrizzleRepository` |
| `source.pg-drizzle.mapper.ts` | `SourcePgDrizzleMapper` |
| `embed-job.bullmq.dispatcher.ts` | `EmbedJobBullMqDispatcher` |
| `source.sha256.fingerprinter.ts` | `SourceSha256Fingerprinter` |

Class name은 동일한 순서를 따른다: `{DomainName}{AdapterOrPurpose}{Role}`.

## 디렉토리 구조

Infrastructure code는 adapter category와 기술별로 구성한다:

```
infrastructure/
  {category}/
    {technology}/
      *.{adapter}.{role}.ts
      __tests__/
```

- **category**: adapter의 종류 (예: `persistence`, `queue`, `fingerprinter`)
- **technology**: 구체적인 기술 (예: `postgres-drizzle`, `bullmq`)

Category에 기술이 하나이고 변경 가능성이 없을 때는 technology subdirectory를 생략할 수 있다.

예시:

```
infrastructure/
  persistence/
    postgres-drizzle/
      source.pg-drizzle.repository.ts
      source.pg-drizzle.mapper.ts
      __tests__/
  queue/
    bullmq/
      embed-job.bullmq.dispatcher.ts
      __tests__/
  fingerprinter/
    source.fingerprinter.sha256.ts
    __tests__/
```