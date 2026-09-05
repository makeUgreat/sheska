---
title: Documentation Guidelines
lang: en
audience: both
applies_to:
  - project Markdown documents
translation: ../ko/documentation-guidelines.md
related:
  - ./adr.md
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
- Documentation provides feedforward guidance.
  - It shapes decisions before implementation by explaining intent, boundaries, mental models, tradeoffs, and review standards.
- Static analysis, tests, type checks, generators, and CI are feedback controls and verification gates.
  - They verify concrete, structured, and repeatable requirements during or after implementation.
- Documentation SHOULD guide judgment where automation cannot express context well.
- Documentation SHOULD NOT duplicate long mechanical rule lists that are already enforced by feedback controls or verification gates.
  - When a mechanical requirement matters, explain why it exists, when it matters, and where enforcement lives instead of restating every enforced detail.
- Use `MUST` in English documentation only when a human or agent must make the decision before automated verification can help, or when violating the rule creates a policy, correctness, or maintenance risk.
- Prefer flexible guidance for implementation choices that depend on context, provided automated checks or tests can catch the exact required shape later.

## Language Pairs

- Use language-based directory names: `en` for English documents, `ko` for Korean documents.
- A durable convention document MUST have a matching document in the other language, at the same relative path and file name.
  - `docs/en/` pairs with `docs/ko/`.
  - `apps/*/docs/en/` pairs with `apps/*/docs/ko/`.
- Public Markdown files outside language directories SHOULD use English as the base file and Korean as `*.ko.md`, when they are long-lived user-facing or maintainer-facing documents.
  - Example: `README.md` and `README.ko.md`.

## Synchronization

- English and Korean documents MUST keep the same heading hierarchy and major section order.
  - Heading text MAY be translated; exact wording does not need to match.
- Direct sentence-by-sentence translation is not required.
  - A Korean document may use different examples, ordering, or added context than its English pair, per [Writing Style](#writing-style).
- Rules, exceptions, commands, paths, API names, and type names must carry the same meaning in both documents.
- When one language changes, update the paired language in the same PR or change unit.

## Metadata

- Durable convention documents SHOULD include YAML frontmatter or equivalent metadata that identifies the title, language, audience or scope, and paired document.
  - Identify the pair with `translation` in the English document and `source` plus `last_synced` in the Korean document.
- Keep metadata keys consistent within a document family, but do not add keys that are not consumed by readers, tools, or maintenance workflow.
- Include `read_when` only when a document is routed from an index and the trigger is useful at the document itself.
- Include `related` only when there are clear documents that should be read together.
- Use relative paths in cross-document metadata links.

## Document Routing

- Organize documents by when they are read, not only by topic.
- Give each document a clear task trigger that can be routed from `index.md`.

## Document Structure

- Use one `#` for the title and `##` for major rule groups.
  - Go to `###` or deeper only when it keeps a rule, its rationale, exceptions, and examples together under one decision area.
- Order sections by what the reader needs first.
  - Scope and synchronization policy rules before task-specific rules.
  - Default rules before exceptions.
- Group by the decision a reader is making, not by artifact type, chronology, or discovery order.
  - Never create a section just to hold unrelated leftover rules.
- Keep index and routing documents shallow.
  - Route to detailed documents instead of duplicating their policy.

## Rule Quality

- Add a rule only for a reusable principle, long-term convention, review standard, or maintenance reason.
  - Not to patch a temporary repository state, one-off migration gap, or unusual current situation.
- Before adding a rule, check whether an existing section already owns the same decision.
  - Update that section instead of repeating the policy elsewhere.
- Keep temporary handling in work notes, PR descriptions, or the specific change context.
  - Do not promote it to a convention document.
- State durable desired behavior directly.
  - Prefer `Use Y` over `Do not keep the previous X pattern; use Y` when the previous pattern only matters to the current change.
  - Mention current or past implementation details only when they explain a durable boundary, tradeoff, or migration rule.

## Writing Style

### English Documents

- Write for an LLM agent reading in isolation, not for a human reading start to end.
  - Sections get routed and read individually.
  - Make each section self-contained: name the subject explicitly instead of leaning on context from earlier sections.
- Write every rule as a `-` bullet, not a prose paragraph.
  - Put the rule on the top-level bullet and its rationale on a bullet nested under it.
  - A reader scanning bullets should see the decision before the reasoning.
- Use the same term for the same concept every time.
  - Do not vary vocabulary for elegance.
  - An agent matching concepts benefits from consistent naming more than a human benefits from varied prose.
- State a rule's scope and conditions explicitly instead of leaving them implied.
- Avoid pronouns with a distant or ambiguous antecedent.
  - Repeat the subject's name instead of "it" or "this" when a bullet might be read on its own.
- Explain intent for rules covered by static checks, instead of repeating only what the check catches.

### Korean Documents

- Write for a human colleague reading as a developer, not as a translation of the English document.
- Prioritize natural Korean sentence flow and word order over mirroring the English sentence structure.
- Keep code, commands, file paths, URLs, frontmatter keys, API names, type names, package names, identifiers, and product names in their original form.
  - Mixing them into Korean text is normal, not an exception to call out.
- Use whatever example, order, or added context reads most naturally in Korean.
  - The only constraint: it must convey the same policy as the English document.

### Shared Rules

- Write documentation as guidance for capable implementers.
  - Use direct language, but do not turn every preference into a prohibition.
- Include nuance when a rule has tradeoffs, known exceptions, or depends on implementation context.
- Break a long bullet into nested bullets instead of stacking multiple clauses on one line.
  - Each clause gets its own line, nested one level under the point it elaborates.
