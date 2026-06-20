---
title: Planning Documents
lang: en
audience: both
applies_to:
  - product and feature planning
translation: ../ko/README.md
---

# Planning Documents

This directory stores living planning documents for core product and feature intent.
Use these documents to keep the product's requirements, policies, and reasoning aligned with the system as it evolves.

## Role

- Planning documents describe what the product should mean or guarantee, and why that matters.
- Planning documents MAY be written before implementation and used as input to delivery.
- Planning documents MAY also be updated after code exists to record the behavior, requirements, policies, terms, or scope that the implementation established.
- Planning documents SHOULD stay synchronized with core product behavior over time.
- Planning documents SHOULD NOT define detailed implementation mechanics.
- Code remains the source of implementation detail.
- Static analysis, tests, type checks, generators, and CI remain the verification gates for concrete behavior.

## Language Pairs

- Planning documents are maintained as English and Korean paired documents.
- English documents live under `plans/en/`.
- Korean documents live under `plans/ko/`.
- Paired documents MUST keep the same relative path, file name, heading hierarchy, and major section order.
- When paired documents conflict, choose the intended policy or requirement and update both documents in the same change unit.

## Writing Guidance

- Focus on what is required and why it matters.
- Prefer durable intent, requirements, policies, terms, and scope over step-by-step behavior.
- Use the structure that fits the planning topic instead of forcing every document into the same sections.
- Include implementation references only when they help future readers connect the plan to stable code or verification.
- Keep uncertainty explicit instead of hiding it in vague statements.

## Creating A Document

- Copy `_template.md` from the matching language directory.
- Create both language versions in the same change unit.
- Adapt the template freely to the planning topic.
- Update the planning document when the source of truth for product intent changes, whether that change started from planning, implementation, or review.
