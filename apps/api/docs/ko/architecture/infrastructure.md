---
title: API Infrastructure 컨벤션
lang: ko
audience: both
applies_to:
  - apps/api
source: ../../en/architecture/infrastructure.md
last_synced: 2026-09-07
related:
  - ./architecture.md
  - ../persistence/persistence.md
  - ./source-dependency.md
---

# API Infrastructure 컨벤션

## 적용 범위

- 다음 파일을 명명하거나 배치하거나 구조화할 때 이 문서를 사용한다.
  - 애플리케이션 계약.
  - Infrastructure 어댑터.
  - 큐 consumer 같은 presentation의 비프로토콜 인바운드 어댑터.
  - Kernel 유틸리티.
- 이 문서의 범위를 벗어나는 결정에는 관련 컨벤션을 사용한다.
  - 데이터베이스 스키마, ORM, migration, repository mapper, 저장소 제약 규칙은
    [persistence 정책](../persistence/persistence.md)을 사용한다.
  - import 방향과 레이어 경계는 [source dependency 컨벤션](./source-dependency.md)을 사용한다.
  - 기술 결합 어댑터가 infrastructure(driven)인지 presentation(driving)인지 분류할 때는 해당 문서의
    Presentation Layer 섹션을 사용한다.
- 어댑터 파일 명명 패턴은 서로 다른 레이어에 있더라도 infrastructure 어댑터와 presentation의
  비프로토콜 인바운드 어댑터가 공유한다.

## Contract 파일 명명

- Repository 계약, query 포트, lookup 포트 같은 애플리케이션 계약 파일은 다음 패턴을 따른다.

```
{domain-name}.{semantic-role}.ts
```

- **domain-name**: 계약이 대상으로 하는 aggregate, entity 또는 개념 (예: `post`, `source`).
- **semantic-role**: 계약이 하는 일을 도메인 또는 기술 용어로 표현한다 (예: `query`, `lookup`,
  `repository`).

| 파일 | 인터페이스 |
| --- | --- |
| `post.query.ts` | `PostQuery` |
| `source.query.ts` | `SourceQuery` |
| `source.lookup.ts` | `SourceLookup` |
| `embedder.ts` | `Embedder` (개념과 역할이 같은 단어인 경우) |

- 계약은 사용하는 아키텍처 패턴이 아니라 제공하는 기능으로 이름을 짓는다.
  - `.port.ts` 파일 접미사를 사용하지 않는다.
  - 계약 타입 이름에 `Port` 접미사를 붙이지 않는다.
  - `port`는 계약의 의미 역할이 이미 전달하는 것 이상의 정보를 추가하지 않는다.

## Adapter 파일 명명

- Infrastructure 어댑터 파일 이름은 다음 패턴을 따른다.

```
{domain-name}.{adapter-or-purpose}.{role}.ts
```

- **domain-name**: 어댑터가 담당하는 aggregate, entity 또는 port 개념 (예: `source`, `embed-job`).
- **adapter-or-purpose**: 기술 또는 어댑터 범주 (예: `drizzle`, `bullmq`, `persistence`, `fingerprinter`).
- **role**: 파일이 담당하는 아키텍처 역할 (예: `repository`, `dispatcher`, `mapper`, `consumer`).

- 이 순서는 대상, 경계, 역할을 정렬해 파일을 일관되게 검색하고 읽을 수 있게 한다.

| 파일 | 클래스 |
| --- | --- |
| `source.pg-drizzle.repository.ts` | `SourcePgDrizzleRepository` |
| `source.pg-drizzle.mapper.ts` | `SourcePgDrizzleMapper` |
| `embed-job.bullmq.dispatcher.ts` | `EmbedJobBullMqDispatcher` |
| `source.sha256.fingerprinter.ts` | `SourceSha256Fingerprinter` |

- 클래스 이름은 동일한 순서를 따른다: `{DomainName}{AdapterOrPurpose}{Role}`.

## Kernel 유틸리티 파일 명명

- Kernel 디렉터리에는 계약도 어댑터도 아닌 유틸리티가 있을 수 있다.
  - 공유 기반 클래스, generator, codec, mapper, 작은 정책 모듈 등이 해당한다.
  - Kernel 유틸리티 파일은 계약 파일과 같은 2단 패턴을 따른다.

```
{name}.{role}.ts
```

- **name**: 파일이 다루는 개념 (예: `cursor`, `id`, `error-log`).
- **role**: 파일이 하는 일을 역할 단어로 표현한다 (예: `codec`, `generator`, `mapper`, `paginator`,
  `base`, `exception`, `tokens`, `classifier`).

- 개념과 역할이 같은 단어일 때는 위 `embedder.ts`처럼 단어 하나만 사용한다.

| 파일 | Export |
| --- | --- |
| `cursor.codec.ts` | `encodeCursor`, `decodeCursor` |
| `cursor.paginator.ts` | `sliceForCursor` |
| `id.generator.ts` | `newId` |
| `error-log.mapper.ts` | `toErrorLogContext` |

## 디렉토리 구조

- Infrastructure 코드는 어댑터 범주와 기술별로 구성한다.

```
infrastructure/
  {category}/
    {technology}/
      *.{adapter}.{role}.ts
      __tests__/
```

- **category**: 어댑터 종류 (예: `persistence`, `queue`, `fingerprinter`).
- **technology**: 구체적인 기술 (예: `postgres-drizzle`, `bullmq`).

- 범주에 기술이 하나이고 변경 가능성이 없을 때는 기술 하위 디렉터리를 생략할 수 있다.

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
    source.sha256.fingerprinter.ts
    __tests__/
```
