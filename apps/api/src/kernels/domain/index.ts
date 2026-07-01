export { AggregateRoot } from './aggregate-root.base';
export { DomainException } from './domain.exception';
export { DomainEvent, type DomainEventParams } from './domain-event.base';
export {
  Entity,
  type AggregateID,
  type CreateEntityProps,
} from './entity.base';
export {
  DOMAIN_ERROR_KIND,
  type DomainError,
  type DomainErrorBase,
  type DomainErrorOf,
  type DomainErrorKind,
  type DomainValidationDetails,
} from './error.base';
export { newId } from './id-generator';
export { ValueObject, type DomainPrimitive } from './value-object.base';
