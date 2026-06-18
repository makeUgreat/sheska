---
title: Documentation Convention Index Router
lang: en
audience: human
applies_to:
  - docs/en/index.md
translation: ../ko/documentation-index-router.md
---

# Documentation Convention Index Router

## Purpose

`docs/en/index.md` is the routing entry point for documentation convention documents.
Its job is to help readers and agents decide which documentation-writing rules to read for the current task.
It is not a project-wide documentation catalog.

## Basic Rules

- The index MUST be short.
- The index MUST route only documentation convention documents under `docs/`.
- The index MUST link to task-specific documents.
- The index MUST describe when each document should be read.
- The index MUST NOT duplicate detailed rules from linked documents.
- The index MAY include global documentation rules that apply before reading other documents.
- The index MUST NOT include every project document, app-specific convention document, or detailed content from linked documents.

## Routing Paths

- Documentation links do not need to form a strict tree.
- Required reading paths SHOULD stay acyclic.
- `AGENTS.md` SHOULD point to this index as the documentation convention entry point.
- This index SHOULD route outward to task-specific documents.
- Task-specific documents MUST NOT require readers to return to this index before they can be used.
- Related links MAY be cyclic when they are optional references.
- Avoid instructions that require reading all related documents for complete context.

## Required Sections

- `Source Of Truth`: define which language or document set is canonical.
- `Reading Rules`: define how much documentation should be loaded.
- `Routing`: list task situations and the documents that should be read.

## Non-Goals

The index MUST NOT contain:

- Full coding rules
- Full architecture explanations
- Full domain policies
- App-specific convention routing
- Long project background
- Repeated content from linked documents
- Linter, formatter, or CI rule lists

## Maintenance

- When adding a new documentation convention document, add it to the routing section only if it has a clear documentation-work trigger.
- Do not add app-specific documents to this index; route them from that app's own documentation entry point.
- Keep the routing description short.
- Do not summarize the full document in the index.
- Add or update the Korean translation link when applicable.
