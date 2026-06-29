export { AggregateRoot } from './aggregate-root.base';
export { DomainEvent, type DomainEventParams } from './domain-event.base';
export {
  Entity,
  type AggregateID,
  type CreateEntityProps,
} from './entity.base';
export { newId } from './id-generator';
export { ValueObject, type DomainPrimitive } from './value-object.base';
export type { DomainFailure, DomainFailureOf } from './failure.base';
export { DOMAIN_FAILURE_KIND } from './failure.base';
