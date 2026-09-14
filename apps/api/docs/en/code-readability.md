---
title: API Code Readability Convention
lang: en
audience: both
applies_to:
  - apps/api
translation: ../ko/code-readability.md
read_when:
  - Writing or reviewing conditional logic and boolean names in API code
---

# API Code Readability Convention

## Meaningful Conditions

- Give a meaningful condition a name when the raw expression does not clearly communicate the state or decision used by the control flow.
  - Prefer a positively named boolean such as `hadListeners`, `hasListeners`, or `isValid`.
  - Negate the positive boolean at a negative guard branch instead of encoding the negation in a name such as `hadNoListeners`.
  - Keep an immediately clear condition inline when extracting it would only repeat the expression without adding meaning.

```ts
const hadListeners = listenerResults.length > 0;

if (!hadListeners) {
  throw new Error(`No listener registered for ${event.eventType}`);
}
```
