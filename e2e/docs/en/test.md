---
title: E2E Test Convention
lang: en
audience: both
applies_to:
  - e2e
translation: ../ko/test.md
related:
  - ./index.md
---

# E2E Test Convention

E2E tests verify complete user journeys through a real browser against a running system.
A journey begins when a user or external actor takes an action and ends when the user observes the result in the browser.
Use this document when writing, reviewing, or deciding the scope of E2E test cases.

## Scope

An E2E test starts a real browser, loads the running UI, and asserts what a user can observe on screen.
It must not inspect internal framework state, mock network calls, or assert values that are invisible to a user.

## What E2E Uniquely Owns

### Complete User Journeys

E2E tests verify scenarios that span multiple steps and pages, matching how a real user experiences the product.
Each test should represent a meaningful user goal — for example, a user uploading a note and confirming it appears in the source list, or publishing a post and seeing it reflected in the posts page.
No lower-level test layer can cover this because each layer only exercises one part of the system in isolation.

### Rendering

Rendering is a property every journey relies on: data returned by the API must be visible in the browser.
The path from API response → React Query cache → component render → visible DOM is only exercised in a real browser session.
Lower-level tests stop short: UI unit tests mock the network; API client integration tests run in Node without a browser.

### Navigation

Navigation is a property every multi-step journey relies on: page transitions, link clicks, back navigation, and URL parameter extraction must work in a real browser with a real history stack.

### System Composition

A running E2E session is the only test that exercises all services — UI, API, and database — wired together simultaneously.
Configuration errors such as a missing environment variable or a CORS misconfiguration will not surface in any single-service test but will break an E2E session.

### Error Display

E2E tests verify that system failures produce visible user feedback in the browser.
Only a real browser session confirms that error states are rendered to the DOM rather than silently swallowed.

## External Actors

Some user journeys begin with an action taken outside the browser — for example, a user uploading a note from the Obsidian plugin, which creates a source that later appears in the UI.

These journeys are in E2E scope because the user's goal spans both the external action and the browser-visible result.

However, E2E tests MUST NOT automate the external actor application itself.
Instead, simulate the external action by calling the same public API the actor uses.
The external actor's own correctness — for example, whether the Obsidian plugin sends the correct request — is covered by that app's own tests.

```
[In an E2E test]
POST /sources        ← simulates what the Obsidian plugin does
      ↓
Visit UI in browser → assert the source appears in the list
```

This keeps E2E tests focused on the browser-visible outcome without taking on ownership of another app's behavior.

## Network Failure Simulation

Testing the Error Display property requires the browser to encounter a network failure.
E2E tests MAY abort network connections to the API to simulate the API being unreachable.

Aborting a connection is not the same as mocking a response.
A mock returns fabricated data in place of a real response; aborting causes the browser to see a connection failure with no response, which is exactly what happens when the API is down.
This is the only permitted form of network interception in E2E tests.
Intercepting requests to return fake response data is not permitted.

## What E2E Must Not Own

The following concerns are already covered by lower-level tests.
E2E tests MUST NOT duplicate them.

| Concern | Owned by |
|---------|----------|
| HTTP response shape and status codes | API HTTP integration tests |
| API client deserialization and parsing | UI API client integration tests |
| Component rendering with controlled props | UI unit tests |
| Business logic and domain invariants | API unit tests |
| Real adapter behavior (database, queue, embedder) | API adapter integration tests |
| External actor application behavior | That actor app's own tests |

Duplicating these concerns in E2E tests adds test cost and brittleness without adding confidence.
When a failure in this layer surfaces in an E2E test, treat it as a signal to add or fix coverage at the responsible lower layer, not to expand E2E coverage.

## Decision Rules

Write an E2E test when:

- The test represents a complete user goal that spans multiple steps or pages.
- The test verifies that an action — whether taken in the browser or by an external actor — produces a visible result in the browser.
- The behavior is only observable through a real browser against a running system.

Skip an E2E test when:

- The same behavior is already verifiable at a lower layer without significant loss of confidence.
- The test verifies logic contained within a single layer or a single app.
- The test would duplicate HTTP contract, parsing, rendering-with-props, or external actor behavior already covered elsewhere.

## Test Setup

E2E tests SHOULD set up preconditions through the public API rather than inserting directly into the database.
This matches the protocol real users and integrations use, avoids coupling tests to internal persistence details, and keeps the seeding step itself within the verified system boundary.
