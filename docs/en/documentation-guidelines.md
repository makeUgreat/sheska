---
title: Documentation Guidelines
lang: en
audience: human
applies_to:
  - project Markdown documents
translation: ../ko/documentation-guidelines.md
---

# Documentation Guidelines

Durable project Markdown documents are maintained as paired English and Korean documents when they define conventions, project behavior, or long-lived project understanding.
Paired documents should describe the same policy.

## Synchronization Policy

- English and Korean documents are paired policy documents.
- Neither language automatically wins when paired documents conflict.
- If paired documents conflict, choose the intended policy from either language and update both documents in the same change unit.
- Do not keep one language knowingly stale after resolving a conflict.

## Scope And Exceptions

- This guideline applies to durable project Markdown documentation, including root documentation, repository-wide docs, app docs, and maintained tool READMEs.
- Agent instruction files such as `AGENTS.md` are execution instructions rather than human-facing documentation, so language pairs are not required.
- Temporary or hidden working notes, such as files under `.codex/temp/`, are excluded.
- Generated documents, short local notes, and narrow tool-specific files may stay single-language when a paired document would add maintenance cost without improving project understanding.

## Documentation Role

- This project treats documentation as part of the engineering harness.
- Documentation provides feedforward guidance: it should shape decisions before implementation by explaining intent, boundaries, mental models, tradeoffs, and review standards.
- Static analysis, tests, type checks, generators, and CI are feedback controls and verification gates: they verify concrete, structured, and repeatable requirements during or after implementation.
- Documentation SHOULD guide judgment where automation cannot express context well.
- Documentation SHOULD NOT duplicate long mechanical rule lists that are already enforced by feedback controls or verification gates.
- When a mechanical requirement matters, documentation SHOULD explain why it exists, when it matters, and where enforcement lives instead of restating every enforced detail.
- Use `MUST` in documentation only when a human or agent must make the decision before automated verification can help, or when violating the rule creates a policy, correctness, or maintenance risk.
- Prefer flexible guidance for implementation choices that depend on context, provided automated checks or tests can catch the exact required shape later.

## Language Pairs

- Use language-based directory names for translated documentation.
- Use `en` for English documents and `ko` for Korean documents.
- Durable convention documents under `docs/en/` MUST have matching Korean documents under `docs/ko/` with the same relative path and file name.
- Durable app convention documents under `apps/*/docs/en/` MUST have matching Korean documents under `apps/*/docs/ko/` with the same relative path and file name.
- Public Markdown files outside language directories SHOULD use English as the base file and Korean as `*.ko.md` when they are long-lived user-facing or maintainer-facing documents. Example: `README.md` and `README.ko.md`.

## Synchronization

- English and Korean documents MUST keep the same heading hierarchy and major section order.
- Heading text MAY be translated. The hierarchy and order must match, but exact heading words do not need to match.
- Direct sentence-by-sentence translation is not required.
- Rules, exceptions, commands, paths, code examples, API names, and type names must have the same meaning in both documents.
- When one language changes, update the paired language in the same PR or change unit.

## Metadata

- Durable convention documents SHOULD include YAML frontmatter or equivalent metadata that identifies the title, language, audience or scope, and paired document.
- Keep metadata keys consistent within a document family, but do not add keys that are not consumed by readers, tools, or maintenance workflow.
- Include `read_when` only when a document is routed from an index and the trigger is useful at the document itself.
- Include `related` only when there are clear documents that should be read together.
- Use relative paths in cross-document metadata links.

## Document Routing

Documents should be organized by when they are read, not only by topic.
Each document should have a clear task trigger that can be routed from `index.md`.

## Document Structure

- Use one `#` heading for the document title.
- Use `##` headings for major rule groups.
- Use `###` headings only when a `##` section has multiple distinct subgroups.
- Put scope and synchronization policy rules before task-specific rules.
- Put default rules before exceptions.
- Group related rules under explicit headings instead of using one long mixed list.
- Avoid sections whose only purpose is to hold unrelated leftover rules.

## Rule Quality

- Add documentation rules only when they express a reusable principle, long-term convention, review standard, or maintenance reason.
- Add rules when they improve future decisions before automated checks run.
- Avoid adding rules that only patch a temporary repository state, one-off migration gap, or unusual current situation.
- Avoid documenting exact syntax, formatting, or structure only to mirror an automated check, unless the document adds intent, boundaries, or routing.
- Keep temporary handling in work notes, PR descriptions, or the specific change context instead of promoting it to a convention document.

## Writing Style

### English Documents

- Write English agent-facing documents in concise, directive prose.
- Prefer concise rules, but include rationale when judgment, tradeoffs, or exceptions matter.
- Explain intent for rules covered by static checks, instead of repeating only what the check catches.

### Korean Documents

- Translate prose and section headings in Korean documents.
- Write Korean human-facing documents naturally, but keep the strength of requirements the same.
- Translate requirement language into natural Korean wording.

### Shared Rules

- Keep code, commands, file paths, URLs, frontmatter keys, API names, type names, package names, identifiers, and product names untranslated.
- Use precise requirement language. Do not make one language stricter or looser than its pair.
- Write documentation as guidance for capable implementers. Use direct language, but do not turn every preference into a prohibition.
- Include nuance when a rule has tradeoffs, known exceptions, or depends on implementation context.

## Requirement Language

- Use `MUST` for rules that are mandatory and clearly reviewable.
- Use `MUST NOT` for forbidden behavior.
- Use `SHOULD` for default rules that allow justified exceptions.
- Use `SHOULD NOT` for behavior to avoid unless there is a reason.
- Use `MAY` for explicitly allowed behavior.
- Use `Prefer` to mark priority between valid options.
- Use `Avoid` to discourage a pattern without forbidding it.
- In Korean documents, translate requirement keywords into natural Korean phrases while preserving requirement strength.
- Do not overuse `MUST`; reserve it for policy violations, correctness risks, or rules that can be judged consistently.
