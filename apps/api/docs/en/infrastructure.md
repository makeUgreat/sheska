---
title: API Infrastructure Convention
lang: en
audience: both
applies_to:
  - apps/api
translation: ../ko/infrastructure.md
related:
  - ./architecture.md
  - ./persistence.md
  - ./source-dependency.md
---

# API Infrastructure Convention

This document defines naming and structure conventions for infrastructure adapter code.
Persistence-specific rules are in the [API Persistence Policy](./persistence.md).

## Scope

- Use this document when naming, placing, or structuring application contract files or infrastructure adapter files.
- Use the persistence policy for database schema, ORM, migration, repository mapper, and storage constraint rules.
- Use the source dependency convention for import direction and layer boundary rules.

## Contract File Naming

Application contract files (interfaces that define ports — repository contracts, query ports, lookup ports, etc.) follow the pattern:

```
{domain-name}.{semantic-role}.ts
```

- **domain-name**: the aggregate, entity, or concept the contract is for (e.g. `post`, `source`)
- **semantic-role**: what the contract **does**, expressed as a domain or technical term (e.g. `query`, `lookup`, `repository`). Never use `port` here — it names the architectural pattern, not the contract's purpose.

Examples:

| File | Interface |
| --- | --- |
| `post.query.ts` | `PostQuery` |
| `source.query.ts` | `SourceQuery` |
| `source.lookup.ts` | `SourceLookup` |
| `embedder.ts` | `Embedder` (concept and role are the same word) |

The `.port.ts` suffix is **not allowed**. It encodes the hexagonal architecture term "port" into the filename, which adds no information beyond what the role already conveys.

## Adapter File Naming

Infrastructure adapter file names follow the pattern:

```
{domain-name}.{adapter-or-purpose}.{role}.ts
```

- **domain-name**: the aggregate, entity, or port concept the adapter serves (e.g. `source`, `embed-job`)
- **adapter-or-purpose**: the technology or adapter category (e.g. `drizzle`, `bullmq`, `persistence`, `fingerprinter`)
- **role**: the architectural role the file plays (e.g. `repository`, `dispatcher`, `mapper`, `consumer`)

This order aligns subject, boundary, and role so files sort and read consistently.

Examples:

| File | Class |
| --- | --- |
| `source.pg-drizzle.repository.ts` | `SourcePgDrizzleRepository` |
| `source.pg-drizzle.mapper.ts` | `SourcePgDrizzleMapper` |
| `embed-job.bullmq.dispatcher.ts` | `EmbedJobBullMqDispatcher` |
| `source.sha256.fingerprinter.ts` | `SourceSha256Fingerprinter` |

Class names follow the same order: `{DomainName}{AdapterOrPurpose}{Role}`.

## Directory Structure

Organize infrastructure code by adapter category and technology:

```
infrastructure/
  {category}/
    {technology}/
      *.{adapter}.{role}.ts
      __tests__/
```

- **category**: the type of adapter (e.g. `persistence`, `queue`, `fingerprinter`)
- **technology**: the specific technology (e.g. `postgres-drizzle`, `bullmq`)

When a category has only one technology and no variation is expected, the technology subdirectory may be omitted.

Examples:

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