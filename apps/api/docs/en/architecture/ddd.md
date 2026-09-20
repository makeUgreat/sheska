---
title: API DDD Convention
lang: en
audience: both
applies_to:
  - apps/api
translation: ../../ko/architecture/ddd.md
related:
  - ./architecture.md
  - ./context-integration.md
  - ./source-dependency.md
  - ../persistence/persistence.md
  - ../persistence/repository-methods.md
---

# API DDD Convention

## Scope

- Use this document when deciding bounded context boundaries, domain model ownership, shared domain language,
  domain-kernel usage, and repository contract names.
- Use the related conventions for decisions outside this document's scope.
  - Use the [architecture convention](./architecture.md) for the source map.
  - Use the [source dependency convention](./source-dependency.md) for import direction.
  - Use the [persistence policy](../persistence/persistence.md) for database and ORM boundaries.

## Model Boundaries

### Bounded Contexts

- A bounded context owns a domain model, ubiquitous language, and responsibility boundary.
  - The same word may have a different meaning in a different bounded context.
  - A folder name may indicate a context, but the boundary is justified by model, language, and responsibility.
- Code outside a bounded context MUST NOT directly modify the context's internal model.
  - Code outside a bounded context SHOULD NOT depend on the context's internal domain objects.
  - Contexts communicate through IDs, DTOs, events, ports, or anti-corruption layers.

### Implementation Modules

- An implementation module is a practical code wiring or framework module unit.
  - An implementation module is not automatically a DDD bounded context.

## Aggregate Reference And Access

### Reference Style

- Use an object reference for another object inside the same aggregate.
- Reference another aggregate by its aggregate root's ID, not by an object reference.
- Do not reference another aggregate's internal entity directly.

### Access Path

- All state changes to an aggregate's internal entities and value objects happen only through the aggregate root's
  own methods.
  - An internal entity changes through a method the aggregate root calls on it, so the change stays inside the
    aggregate boundary.
  - A value object is immutable and exposes no method that changes its own value. "Changing" a value object means
    the aggregate root reassigns its field to a new value object instance; the replacement logic lives on the root
    (or the internal entity that owns the field), never on the value object itself.
  - Code outside the aggregate MUST NOT reach into an internal entity or value object directly. For a value object,
    the risk is not corruption — it cannot be mutated — but bypassing the root still exposes internal structure the
    aggregate boundary exists to hide. See [Domain Encapsulation](#domain-encapsulation) for the getter and snapshot
    rules that follow from this.
  - External code always reads and changes an aggregate through its root.

```ts
const order: Order = await orderRepository.findById(orderId);
order.changeLineQuantity(lineId, 3);
await orderRepository.save(order);
```

- A repository method that loads an internal entity directly, such as `orderLineRepository.findById()`, violates this rule.

### Aggregate Coordination Responsibility

- The application layer coordinates the load, create, and save order across multiple aggregates by default.
- Use application orchestration or domain events when a direct dependency would create a cycle, or when the
  operation needs information from multiple aggregates or external services at once.

### Exception Within One Bounded Context

- A one-directional aggregate dependency, or a factory method that creates another aggregate, MAY be allowed when the
  domain meaning is unambiguous and both aggregates belong to the same bounded context.
  - This is an exception to the coordination responsibility above; it does not extend across a bounded context
    boundary.

### Bounded Context Boundary

- Follow the [Bounded Contexts](#bounded-contexts) rule above: a different bounded context's aggregate type is never
  referenced directly from the domain layer.

### Repository Loading Responsibility

- Premise: every state change to an internal entity happens only through an aggregate root method; application code
  or other outside code never pulls out an internal entity and changes it directly.
- Because this premise holds, when a root method such as `order.changeLineQuantity()` finds a line inside `lines` and
  changes its quantity while checking an invariant (for example, a stock limit), the repository must already have
  loaded `lines` at `findById()` time. The operation is impossible if the state the root method needs is not in
  memory when the method runs.
- A repository MUST fully restore whatever aggregate state its domain operations need to check invariants.
  - When a root method reads or changes an internal entity, the repository must load that internal entity together
    with the root.
  - Whether the query uses a JOIN is a loading detail and an infrastructure implementation choice, not a domain rule.
    See the [JOIN Policy](../persistence/repository-methods.md#join-policy).

### Warning Sign

- If restoring an entire aggregate every time feels expensive, question whether the aggregate is too large before
  reaching for a loading optimization.

## Domain Kernel

- `kernels/domain` contains domain-layer kernel code shared by context domain layers.
  - Domain-kernel code may include stable domain-layer policies.
  - Domain-kernel code may include stable domain concepts intentionally shared by multiple bounded contexts.
  - Review shared domain concept changes with the affected context owners.
- `kernels/domain` MUST NOT be used as a generic duplication-removal directory.
  - Prefer duplication over premature domain-kernel code when a concept is unstable or context-specific.

## Domain Model Building Blocks

- DDD building blocks are chosen by the domain role they play, not by where a class happens to live.

### Project-Relevant Building Block Roles

| Concept        | Role                                                                                                                                                                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entity         | Domain object with identity whose state can change during its lifecycle.                                                                                                                                                                             |
| Value Object   | Immutable object whose meaning is determined by its values, not by identity.                                                                                                                                                                         |
| Aggregate      | Group of entities and value objects whose consistency must be protected together.                                                                                                                                                                    |
| Aggregate Root | Only externally reachable entry point into an aggregate; it protects aggregate invariants.                                                                                                                                                           |
| Repository     | Domain collection-like abstraction for saving and retrieving aggregates; it is not a database query helper. Repository reads are **read-for-write**: aggregates are loaded to call domain methods on them or to verify preconditions before a write. |

### Responsibility Placement

- Put a rule in the domain when it is a business invariant that must hold regardless of caller, storage, transport, or
  use case entry point.
- Put orchestration in the application layer when code decides what to load, authorize, call, transact, and save to
  execute a use case.
  - Application services and use cases load needed objects, call domain methods or domain services, and save changes.
  - Application services and use cases should not implement domain judgments directly.
- Put implementation in the infrastructure layer when code decides how to query, persist, publish, call an external
  API, or use a technical library.

### Value Object Raw Value Access

- Use `unpack()` to read the raw value from a value object.
  - When reading several fields from a composite value object, call `unpack()` once and reuse the result.

## Domain Events

- An aggregate records domain events but does not publish them directly.
  - The aggregate MUST NOT depend on an event emitter, event publisher, logger, outbox writer, or transport to deliver
    its recorded events.
  - A concrete domain event declares its `eventName` as a `readonly` literal property on the class.
  - Do not extract a module-level constant solely to initialize the concrete domain event's `eventName`.
- Application orchestration collects recorded domain events and decides how to hand them off.
  - For cross-context delivery, map domain events to integration events.
  - When the delivery must be durable, persist the integration events through an outbox in the same transaction as
    the aggregate changes.
- Clear an aggregate's recorded domain events only after the intended handoff succeeds.
  - Keep the events recorded when aggregate persistence or outbox persistence fails.
- A domain event does not require an outbox merely because it is an event.
  - When a reaction is required to complete the current use case, invoke the behavior explicitly instead of relying
    on asynchronous event delivery.
  - For durable cross-context delivery, map the domain event to an integration event and persist that integration
    event in the outbox; do not serialize the domain event class into the integration-event outbox directly.
  - If a same-context asynchronous reaction later requires durable delivery, define a separate internal durable
    message contract and deliberately extend the outbox policy. Do not misclassify it as an integration event only
    because it needs persistence.
  - A domain event store used for event sourcing is a different persistence mechanism from a transactional outbox.

## Repository Method Naming

- `save` persists an aggregate through the repository contract.
  - Use `save` for create and update unless the context has a meaningful separate command.
- `find` looks up one aggregate by a unique lookup and returns `null` when it is absent.
  - Express the lookup meaning through object parameter field names.
  - Examples: `find({ id })`, `find({ externalSourceId })`.
- `get` means the caller expects the resource to exist.
  - Its return type MUST be `Promise<T>`, never `Promise<T | null>`.
  - When the resource is absent, the implementation throws `InfrastructureException(NOT_FOUND)`.
  - Use the same object parameter naming as `find`. Example: `get({ id })`.
- `find` and `get` criteria MUST be object types.
  - Primitive parameters such as `find(id: string)` or `get(sourceId: string)` are not allowed.
  - Use `find({ id })` or `get({ id })` instead.
  - One call shape covers every lookup, so a reader recognizes a repository call without checking which field it looks up by.
  - A new lookup field extends the criteria type instead of adding a method, which keeps the contract from growing one method per field combination.
  - Named fields remove positional-argument mistakes between parameters of the same type, which a compiler cannot catch.
  - Criteria objects should express only unique lookups that identify one resource.
  - Use `list` for filtering that can return multiple results.
- Express the lookup field through the criteria object rather than encoding it into the method name.
  - Example: prefer `find({ sourceId })` over `findBySourceId(sourceId)`.
  - The reason is the method-per-field growth above. `sourceId` is a domain concept, so `findBySourceId` is not a storage leak.
- `list` returns multiple aggregates without pagination.
  - It SHOULD accept an explicit criteria object when filtering is needed.
- Avoid repository method names that expose storage mechanics, query implementation, or table shape.
  - Examples of names to avoid: `selectRows`, `findWithJoin`, `queryByIndex`, `upsertRow`.
  - Such a name commits a domain-owned contract to how the data is stored, so changing the storage shape forces a change to the contract.
- For call-site guidance on when to use each method, see
  [Repository Method Usage Guide](../persistence/repository-methods.md).

## Domain Encapsulation

- Domain objects SHOULD expose behavior through intention-revealing methods.
  - Avoid generic getters that mirror internal props.
  - Avoid snapshots whose main purpose is to let callers inspect domain state and make domain decisions externally.
  - Ask the object to answer a domain question or perform a domain action instead of deciding externally.
  - Examples include `isPublishable`, `hasContentHash`, and `markDeleted`.
- DTO, persistence, or presentation mapping MAY use explicit mappers or purpose-specific read models at layer
  boundaries, but those shapes should not become the domain model's default API.
- Value objects MAY expose a primitive value when the value itself is the domain concept; entities and aggregates
  should prefer behavior-oriented APIs.

## Domain API Type Extraction

- Prefer inline object types for simple method parameters or return values that are used by one method and are easy to
  understand from the method name.
- Use local, non-exported types when a shape is reused inside one aggregate, would make signatures noisy, or
  represents internal restore/persistence mapping details.
- Export method parameter, result, and status types only when another layer or bounded context should import them as a
  stable contract.
  - Do not create `Params`, `Result`, or `Status` types only because a method is public.
  - Prefer a domain name over a mechanical suffix when a type is worth naming.
  - Keep the shape inline when the type is not worth naming.

## Review Checks

- Check whether another aggregate is referenced by ID rather than by object reference, and whether an internal
  entity of another aggregate is referenced directly.
- Check whether an aggregate's internal entity or value object changes only through the aggregate root's own
  methods, never by external code reaching in directly.
- Check whether multi-aggregate coordination lives in application orchestration or domain events rather than a
  direct cross-aggregate dependency, except for the same-bounded-context exception.
- Check whether a repository loads the internal state a root method's invariant check needs, not only the fields the
  current call site happens to display.
- Check whether a new shared abstraction is really a stable domain concept before making it domain-kernel code.
- Check whether a bounded context's public language is leaking another context's internal model.
- Check whether a domain object is expressing business behavior instead of acting as a database row or request DTO.
- Check whether a business invariant belongs in the domain instead of application orchestration or infrastructure
  implementation.
- Check whether a use case is invoking domain behavior instead of extracting state and making domain decisions
  externally.
- Check whether a repository is modeling aggregate storage and retrieval rather than exposing storage mechanics as a
  query helper.
- Check whether communication across model boundaries uses IDs, DTOs, events, ports, or anti-corruption mapping.
