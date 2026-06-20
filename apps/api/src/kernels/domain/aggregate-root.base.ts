import { Entity, type EntityId } from './entity.base';

export abstract class AggregateRoot<
  TId extends EntityId,
  EntityProps,
> extends Entity<TId, EntityProps> {}
