import { Guard } from '@core/guard';
import { err, ok, type Result } from '@core/result';
import { type EntityDomainError } from './entity.error';
import { type DomainError } from './error.base';

export type EntityId = string | number;

export interface BaseEntityProps<TId extends EntityId = EntityId> {
  id: TId;
}

export interface EntityParams<TId extends EntityId, T> {
  id: TId;
  props: T;
}

export interface ConstructEntityOptions<
  TId extends EntityId,
  EntityProps,
  TError extends DomainError,
  TInstance extends Entity<TId, EntityProps>,
> {
  params: EntityParams<TId, EntityProps>;
  validate: (
    params: EntityParams<TId, EntityProps>,
  ) => Result<EntityParams<TId, EntityProps>, TError>;
  instantiate: (params: EntityParams<TId, EntityProps>) => TInstance;
}

export abstract class Entity<TId extends EntityId, EntityProps> {
  protected readonly _id: TId;
  protected readonly props: EntityProps;

  protected constructor(params: EntityParams<TId, EntityProps>) {
    this._id = params.id;
    this.props = params.props;
  }

  protected static construct<
    TId extends EntityId,
    EntityProps,
    TError extends DomainError,
    TInstance extends Entity<TId, EntityProps>,
  >(
    options: ConstructEntityOptions<TId, EntityProps, TError, TInstance>,
  ): Result<TInstance, EntityDomainError | TError> {
    return Entity.validateBaseParams(options.params)
      .andThen(options.validate)
      .map(options.instantiate);
  }

  get id(): TId {
    return this._id;
  }

  getProps(): EntityProps & BaseEntityProps<TId> {
    return Object.freeze({
      ...this.props,
      id: this._id,
    });
  }

  private static validateBaseParams<TId extends EntityId, EntityProps>(
    params: EntityParams<TId, EntityProps>,
  ): Result<EntityParams<TId, EntityProps>, EntityDomainError> {
    if (!Guard.isPlainObject(params.props)) {
      return err({
        kind: 'invariant_violation',
        code: 'entity.props_not_object',
        message: 'Entity props must be an object',
        details: { fields: ['props'] },
      });
    }

    return ok(params);
  }
}
