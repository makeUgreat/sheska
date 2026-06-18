---
title: Documentation Guidelines
lang: en
audience: human
applies_to:
  - project Markdown documents
translation: ../ko/documentation-guidelines.md
---

# Documentation Guidelines

Public project Markdown documents are maintained as English source documents and Korean translations.
English documents are the source of truth, and Korean documents are human-facing translations.

## Source Of Truth

- English documents are the source of truth.
- Korean and other non-English documents are human-facing translations.
- If a non-English document conflicts with the English document, use the English document as the source of truth.
- When a conflict is found, update the translation in the same change unit.

## Scope And Exceptions

- This guideline applies to public project Markdown documentation, including root documentation, repository-wide docs, app docs, and tool READMEs.
- Agent instruction files such as `AGENTS.md` are execution instructions rather than human-facing documentation, so language pairs are not required.
- Temporary or hidden working notes, such as files under `.codex/temp/`, are excluded.

## Language Pairs

- Use language-based directory names for translated documentation.
- Use `en` for English documents and `ko` for Korean documents.
- Documentation under `docs/en/` MUST have a matching Korean document under `docs/ko/` with the same relative path and file name.
- Documentation under `apps/*/docs/en/` MUST have a matching Korean document under `apps/*/docs/ko/` with the same relative path and file name.
- Public Markdown files outside language directories MUST use English as the base file and Korean as `*.ko.md`. Example: `README.md` and `README.ko.md`.

## Synchronization

- English and Korean documents MUST keep the same heading hierarchy and major section order.
- Heading text MAY be translated. The hierarchy and order must match, but exact heading words do not need to match.
- Direct sentence-by-sentence translation is not required.
- Rules, exceptions, commands, paths, code examples, API names, and type names must have the same meaning in both documents.
- When one language changes, update the paired language in the same PR or change unit.

## Frontmatter

- Repository documentation under `docs/en/` and `docs/ko/` MUST include YAML frontmatter.
- English source documents MUST include `title`, `lang: en`, `audience`, `applies_to`, and `translation`.
- Korean translation documents MUST include `title`, `lang: ko`, `audience`, `applies_to`, `source`, and `last_synced`.
- `read_when` is recommended for documents routed from `index.md`.
- Include `related` only when there are clear documents that should be read together.
- Use relative paths in `related`, `translation`, and `source`.

## Document Routing

Documents should be organized by when they are read, not only by topic.
Each document should have a clear task trigger that can be routed from `index.md`.

## Document Structure

- Use one `#` heading for the document title.
- Use `##` headings for major rule groups.
- Use `###` headings only when a `##` section has multiple distinct subgroups.
- Put scope and source-of-truth rules before task-specific rules.
- Put default rules before exceptions.
- Group related rules under explicit headings instead of using one long mixed list.
- Avoid sections whose only purpose is to hold unrelated leftover rules.

## Rule Quality

- Add documentation rules only when they express a reusable principle, long-term convention, review standard, or maintenance reason.
- Avoid adding rules that only patch a temporary repository state, one-off migration gap, or unusual current situation.
- Keep temporary handling in work notes, PR descriptions, or the specific change context instead of promoting it to a convention document.

## Writing Style

### English Documents

- Write English agent-facing documents in concise, directive prose.
- Prefer short rules over explanatory paragraphs.
- Explain intent for rules covered by static checks, instead of repeating only what the check catches.

### Korean Documents

- Translate prose and section headings in Korean documents.
- Write Korean human-facing documents naturally, but keep the strength of requirements the same.

### Shared Rules

- Keep code, commands, file paths, URLs, frontmatter keys, requirement keywords, API names, type names, package names, identifiers, and product names untranslated.
- Use precise requirement language. Do not make one language stricter or looser than its pair.

## Requirement Language

- Use `MUST` for rules that are mandatory and clearly reviewable.
- Use `MUST NOT` for forbidden behavior.
- Use `SHOULD` for default rules that allow justified exceptions.
- Use `SHOULD NOT` for behavior to avoid unless there is a reason.
- Use `MAY` for explicitly allowed behavior.
- Use `Prefer` to mark priority between valid options.
- Use `Avoid` to discourage a pattern without forbidding it.
- Keep requirement keywords in English in Korean documents.
- Do not overuse `MUST`; reserve it for policy violations, correctness risks, or rules that can be judged consistently.
