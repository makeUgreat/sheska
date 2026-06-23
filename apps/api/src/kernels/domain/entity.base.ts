import { Guard } from '@core/guard';
import { err, ok, type Result } from '@core/result';
import { type EntityDomainError } from './entity.error';
import { DOMAIN_ERROR_KIND, type DomainError } from './error.base';

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
> {
  params: EntityParams<TId, EntityProps>;
  validate: (
    params: EntityParams<TId, EntityProps>,
  ) => Result<EntityParams<TId, EntityProps>, TError>;
}

type EntityPrototype<
  TId extends EntityId,
  EntityProps,
  TInstance extends Entity<TId, EntityProps>,
> = {
  readonly prototype: TInstance;
};

type EntityConstructor<
  TId extends EntityId,
  EntityProps,
  TInstance extends Entity<TId, EntityProps>,
> = {
  new (params: EntityParams<TId, EntityProps>): TInstance;
};

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
    this: EntityPrototype<TId, EntityProps, TInstance>,
    options: ConstructEntityOptions<TId, EntityProps, TError>,
  ): Result<TInstance, EntityDomainError | TError> {
    const EntityClass = this as unknown as EntityConstructor<
      TId,
      EntityProps,
      TInstance
    >;

    return Entity.normalizeBaseParams(options.params)
      .andThen((params) => Entity.validateBaseParams(params))
      .andThen(options.validate)
      .map((params) => Entity.instantiate(EntityClass, params));
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

  private static normalizeBaseParams<TId extends EntityId, EntityProps>(
    params: EntityParams<TId, EntityProps>,
  ): Result<EntityParams<TId, EntityProps>, never> {
    if (typeof params.id !== 'string') {
      return ok(params);
    }

    return ok({
      ...params,
      id: params.id.trim() as TId,
    });
  }

  private static validateBaseParams<TId extends EntityId, EntityProps>(
    params: EntityParams<TId, EntityProps>,
  ): Result<EntityParams<TId, EntityProps>, EntityDomainError> {
    if (typeof params.id === 'string' && params.id.length === 0) {
      return err({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'entity.id_empty',
        message: 'Entity id cannot be empty',
        details: { fields: ['id'] },
      } satisfies EntityDomainError);
    }

    if (!Guard.isPlainObject(params.props)) {
      return err({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'entity.props_not_object',
        message: 'Entity props must be an object',
        details: { fields: ['props'] },
      } satisfies EntityDomainError);
    }

    return ok(params);
  }

  private static instantiate<
    TId extends EntityId,
    EntityProps,
    TInstance extends Entity<TId, EntityProps>,
  >(
    EntityClass: EntityConstructor<TId, EntityProps, TInstance>,
    params: EntityParams<TId, EntityProps>,
  ): TInstance {
    return new EntityClass(params);
  }
}
