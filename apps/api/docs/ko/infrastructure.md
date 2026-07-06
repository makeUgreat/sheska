---
title: API Infrastructure 컨벤션
lang: ko
audience: both
applies_to:
  - apps/api
source: ../en/infrastructure.md
last_synced: 2026-07-06
related:
  - ./architecture.md
  - ./persistence.md
  - ./source-dependency.md
---

# API Infrastructure 컨벤션

이 문서는 infrastructure adapter code의 명명 및 구조 컨벤션을 정의한다.
Persistence 관련 규칙은 [API Persistence 정책](./persistence.md)에 있다.

## 적용 범위

- Infrastructure adapter file을 명명하거나 배치하거나 구조를 잡을 때 이 문서를 사용한다.
- Database schema, ORM, migration, repository mapper, storage constraint 규칙은 persistence 정책을 사용한다.
- Import direction, layer boundary 규칙은 source dependency 컨벤션을 사용한다.

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