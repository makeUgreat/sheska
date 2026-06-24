export { AggregateRoot } from './aggregate-root.base';
export { DomainEvent, type DomainEventParams } from './domain-event.base';
export { Entity, type EntityId, type EntityParams } from './entity.base';
export { type EntityDomainError } from './entity.error';
export { newId } from './id-generator';
export { ValueObject, type DomainPrimitive } from './value-object.base';
export type { DomainError, DomainErrorOf } from './error.base';
export { DOMAIN_ERROR_KIND } from './error.base';
