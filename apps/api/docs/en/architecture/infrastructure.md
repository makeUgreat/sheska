---
title: API Infrastructure Convention
lang: en
audience: both
applies_to:
  - apps/api
translation: ../../ko/architecture/infrastructure.md
related:
  - ./architecture.md
  - ../persistence/persistence.md
  - ./source-dependency.md
  - ./context-integration.md
---

# API Infrastructure Convention

## Scope

- Use this document when naming, placing, or structuring these files:
  - Application contracts.
  - Infrastructure adapters.
  - Presentation's non-protocol inbound adapters, such as queue consumers.
  - ACL adapters (cross-context Pull adapters under `contexts/A/acl/<B-name>/`).
  - Kernel utilities.
- Use related conventions for decisions outside this document's scope.
  - Use the [persistence policy](../persistence/persistence.md) for database schema, ORM, migration, repository mapper,
    and storage constraint rules.
  - Use the [source dependency convention](./source-dependency.md) for import direction and layer boundaries.
  - Use its Presentation Layer section to classify technology-coupled adapters as infrastructure (driven) or
    presentation (driving).
  - Use the [context integration convention](./context-integration.md) for ACL adapter rules and naming vocabulary.
- The adapter file naming pattern is shared by infrastructure adapters, presentation's non-protocol inbound
  adapters, and ACL adapters even though they live in different layers.

## Contract File Naming

- Application contract files, such as repository contracts, query ports, and lookup ports, follow this pattern:

```
{domain-name}.{semantic-role}.ts
```

- **domain-name**: the aggregate, entity, or concept the contract serves (e.g. `post`, `source`).
- **semantic-role**: what the contract does, expressed as a domain or technical term (e.g. `query`, `lookup`,
  `repository`).

| File | Interface |
| --- | --- |
| `post.query.ts` | `PostQuery` |
| `source.query.ts` | `SourceQuery` |
| `source.lookup.ts` | `SourceLookup` |
| `embedder.ts` | `Embedder` (concept and role are the same word) |

- Name contracts by the capability they provide, not by the architectural pattern they use.
  - Do not use the `.port.ts` file suffix.
  - Do not add a `Port` suffix to contract type names.
  - `port` adds no information beyond the contract's semantic role.

## Adapter File Naming

- Infrastructure adapter file names follow the pattern:

```
{domain-name}.{adapter-or-purpose}.{role}.ts
```

- **domain-name**: the aggregate, entity, or port concept the adapter serves (e.g. `source`, `embed-job`).
- **adapter-or-purpose**: the technology or adapter category (e.g. `drizzle`, `bullmq`, `persistence`,
  `fingerprinter`).
- **role**: the architectural role the file plays (e.g. `repository`, `dispatcher`, `mapper`, `consumer`).

- This order aligns subject, boundary, and role so files sort and read consistently.

| File | Class |
| --- | --- |
| `source.pg-drizzle.repository.ts` | `SourcePgDrizzleRepository` |
| `source.pg-drizzle.mapper.ts` | `SourcePgDrizzleMapper` |
| `embed-job.bullmq.dispatcher.ts` | `EmbedJobBullMqDispatcher` |
| `source.sha256.fingerprinter.ts` | `SourceSha256Fingerprinter` |

- Class names follow the same order: `{DomainName}{AdapterOrPurpose}{Role}`.

## Kernel Utility File Naming

- Kernel directories may contain utilities that are neither contracts nor adapters.
  - Examples include shared base classes, generators, codecs, mappers, and small policy modules.
  - Kernel utility files follow the same two-part pattern as contract files:

```
{name}.{role}.ts
```

- **name**: the concept the file is about (e.g. `cursor`, `id`, `error-log`).
- **role**: what the file does, expressed as a role word (e.g. `codec`, `generator`, `mapper`, `paginator`, `base`,
  `exception`, `tokens`, `classifier`).

- When the concept and the role are the same word, use the single word alone, as with `embedder.ts` above.

| File | Exports |
| --- | --- |
| `cursor.codec.ts` | `encodeCursor`, `decodeCursor` |
| `cursor.paginator.ts` | `sliceForCursor` |
| `id.generator.ts` | `newId` |
| `error-log.mapper.ts` | `toErrorLogContext` |

## Directory Structure

- Organize infrastructure code by adapter category and technology:

```
infrastructure/
  {category}/
    {technology}/
      *.{adapter}.{role}.ts
      __tests__/
```

- **category**: the type of adapter (e.g. `persistence`, `queue`, `fingerprinter`).
- **technology**: the specific technology (e.g. `postgres-drizzle`, `bullmq`).

- When a category has only one technology and no variation is expected, the technology subdirectory may be omitted.

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
