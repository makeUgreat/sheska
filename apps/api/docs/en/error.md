---
title: API Error Policy
lang: en
audience: both
applies_to:
  - apps/api
translation: ../ko/error.md
read_when:
  - Defining, mapping, masking, propagating, or reviewing API errors and system errors.
related:
  - ./architecture.md
  - ./source-dependency.md
---

# API Error Policy

Errors are part of the API's control flow and contracts.
Use this document when deciding what a failure means, who owns it, when it is transformed, and what information it may expose.

## Failure Types

This project separates application-controlled errors from failures the application cannot reasonably control.

- Application-controlled errors are expected failure values owned by application code or a boundary. Use error naming such as `DomainError`, `ApplicationError`, and `InfrastructureError`.
- Exceptions are thrown or framework-level failure objects, such as NestJS `HttpException` or JavaScript `Error`. Reserve exception naming for thrown objects and external framework types where the project does not own the name.
- Vendor raw errors are external adapter, SDK, database, HTTP client, or framework failures before the application translates them.
- System errors are unexpected runtime, process, network, OS, resource, or environment failures that cannot be handled as a normal application contract.
- Logging MAY support observability, but logging alone is not failure handling.

Classify application-controlled errors by the boundary that owns their meaning:

- Domain errors: business rule failures and domain invariant violations.
- Application errors: use case, orchestration, and application-owned contract failures.
- Infrastructure errors: technical adapter failures translated into an application-controlled shape.
- Presentation errors: protocol-facing failure responses, such as HTTP, GraphQL, or request validation failures.

Refine errors by bounded context, aggregate, service, adapter, or use case only when the refined error has distinct contract meaning.

## Error Transformation

Errors SHOULD be transformed when they cross a boundary where the owner, audience, or contract changes.

- Adapter boundaries translate vendor raw errors into infrastructure or other application-controlled errors when they understand the failure.
- Use cases SHOULD pass through domain errors from the same bounded context unchanged. Use case errors should represent orchestration or application-owned failures.
- Use cases MAY translate domain errors only when they intentionally own a different caller-facing contract, such as crossing a bounded context or module boundary.
- Protocol boundaries translate application errors into presentation errors or thrown protocol exceptions.
- Independent bounded contexts or modules translate errors through the communication contract used by that boundary.
- Presentation boundaries MUST mask errors, exceptions, and system errors before exposing them to external clients.

Do not wrap errors only because a call stack crosses an internal folder boundary.
Prefer transformation where it improves contract stability, information hiding, ownership, or caller behavior.

## Error Structure

There is no single correct error shape.
When defining an application-controlled error, prefer this structure unless the owning contract has a reason to differ.

- `kind`: optional stable category for boundary-level handling. Use categories with explicit caller behavior, such as validation failure, dependency unavailability, not found, or state conflict. Do not add catch-all application error kinds for unrecognized system failures.
- `code`: stable value for people and machines to classify the error. Callers SHOULD depend on `code` instead of parsing `message`.
- `message`: human-readable context for debugging, operations, or presentation. It MAY change, be localized, masked, or rewritten. Program code MUST NOT depend on exact `message` text.
- `details`: minimal structured data for caller behavior or machine processing. Because it becomes part of the contract, include only data the receiver may depend on.

Validation errors MAY include field-level details when the caller can act on them.
Do not expose internal diagnostic data through presentation errors unless the protocol contract explicitly allows it.

## Unexpected System Errors

Applications cannot know or handle every possible thrown value or failure.
At boundaries, preserve only the failures the boundary explicitly understands and mask unrecognized failures before exposing them outside the application.

- Convert recognized technical failures into explicit application-controlled categories only when the caller can handle them as part of the contract.
- Keep unrecognized failures on the exception or rejected-promise path until a presentation or process boundary masks them as a safe internal response.
- Preserve the original cause when possible for internal observability.
- Make unrecognized failures observable through logging, metrics, tracing, or another operational signal.
- Do not create silent failures by swallowing unknown failures without handling or observability.

Unexpected system error responses sent outside the application MUST be stable, safe, and masked.
