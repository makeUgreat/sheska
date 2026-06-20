import { type Result } from '@core/result';

export type Primitives = string | number | boolean;

export interface DomainPrimitive<T extends Primitives | Date> {
  value: T;
}

export type ValueObjectProps<T> = T extends Primitives | Date
  ? DomainPrimitive<T>
  : T;

export interface ConstructValueObjectOptions<
  TProps,
  TError,
  TInstance extends ValueObject<unknown>,
> {
  props: TProps;
  validate: (props: TProps) => Result<TProps, TError>;
  instantiate: (props: TProps) => TInstance;
}

export abstract class ValueObject<T> {
  protected readonly props: Readonly<ValueObjectProps<T>>;

  protected constructor(props: ValueObjectProps<T>) {
    this.props = this.createImmutableProps(props);
  }

  protected static construct<
    TProps,
    TError,
    TInstance extends ValueObject<unknown>,
  >(
    options: ConstructValueObjectOptions<TProps, TError, TInstance>,
  ): Result<TInstance, TError> {
    return options.validate(options.props).map(options.instantiate);
  }

  static isValueObject(obj: unknown): obj is ValueObject<unknown> {
    return obj instanceof ValueObject;
  }

  get value(): T {
    if (this.isDomainPrimitive(this.props)) {
      return this.cloneDomainPrimitiveValue(this.props.value);
    }

    return this.props as T;
  }

  equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }

    return JSON.stringify(this.value) === JSON.stringify(vo.value);
  }

  private isDomainPrimitive(
    obj: unknown,
  ): obj is DomainPrimitive<T & (Primitives | Date)> {
    if (!this.isRecord(obj)) {
      return false;
    }

    const keys = Reflect.ownKeys(obj);

    if (keys.length !== 1 || keys[0] !== 'value') {
      return false;
    }

    return this.isPrimitiveValue(obj.value);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private cloneDomainPrimitiveValue<TValue extends Primitives | Date>(
    value: TValue,
  ): TValue {
    if (value instanceof Date) {
      return new Date(value.getTime()) as TValue;
    }

    return value;
  }

  private isPrimitiveValue(value: unknown): value is Primitives | Date {
    return (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value instanceof Date
    );
  }

  private createImmutableProps(
    props: ValueObjectProps<T>,
  ): Readonly<ValueObjectProps<T>> {
    if (this.isDomainPrimitive(props)) {
      const clonedProps = {
        value: this.cloneDomainPrimitiveValue(props.value),
      } as ValueObjectProps<T>;

      return Object.freeze(clonedProps);
    }

    return this.deepFreeze(structuredClone(props));
  }

  private deepFreeze<TValue>(obj: TValue): TValue {
    Object.freeze(obj);

    if (this.isRecord(obj)) {
      Object.getOwnPropertyNames(obj).forEach((prop) => {
        const value = obj[prop];

        if (this.isRecord(value) && !Object.isFrozen(value)) {
          this.deepFreeze(value);
        }
      });
    }

    return obj;
  }
}
