import { Guard } from '@core/guard';

export type AggregateID = string;

export interface BaseEntityProps {
  id: AggregateID;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEntityProps<T> {
  id: AggregateID;
  props: T;
  createdAt?: Date;
  updatedAt?: Date;
}

export abstract class Entity<EntityProps> {
  protected _id: AggregateID;
  protected readonly props: EntityProps;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  protected constructor({
    id,
    createdAt,
    updatedAt,
    props,
  }: CreateEntityProps<EntityProps>) {
    this.setId(id);
    this.validateProps(props);
    const now = new Date();
    this._createdAt = createdAt || now;
    this._updatedAt = updatedAt || now;
    this.props = props;
    this.validate();
  }

  /**
   * There are certain rules that always have to be true (invariants)
   * for each entity. Validate method is called every time an entity is
   * constructed to make sure those rules are respected.
   */
  public abstract validate(): void;

  get id(): AggregateID {
    return this._id;
  }

  private setId(id: AggregateID): void {
    this._id = id;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  getProps(): EntityProps & BaseEntityProps {
    return Object.freeze({
      ...this.props,
      id: this._id,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    });
  }

  private validateProps(props: EntityProps): void {
    if (!Guard.isPlainObject(props)) {
      throw new Error('Entity props must be an object');
    }

    if (Guard.isEmpty(props)) {
      throw new Error('Entity props should not be empty');
    }

    const maxProps = 50;

    if (Object.keys(props).length > maxProps) {
      throw new Error(
        `Entity props should not have more than ${maxProps} properties`,
      );
    }
  }
}
