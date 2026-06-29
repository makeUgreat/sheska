export { AggregateRoot } from './aggregate-root.base';
export { DomainEvent, type DomainEventParams } from './domain-event.base';
export {
  Entity,
  type AggregateID,
  type CreateEntityProps,
} from './entity.base';
export { newId } from './id-generator';
export { ValueObject, type DomainPrimitive } from './value-object.base';
export type { DomainError, DomainErrorOf } from './error.base';
export { DOMAIN_ERROR_KIND } from './error.base';
