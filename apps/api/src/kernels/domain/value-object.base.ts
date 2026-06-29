export type Primitives = string | number | boolean;

export interface DomainPrimitive<T extends Primitives | Date> {
  value: T;
}

export type ValueObjectProps<T> = T extends Primitives | Date
  ? DomainPrimitive<T>
  : T;

export abstract class ValueObject<T> {
  protected readonly props: ValueObjectProps<T>;

  protected constructor(props: ValueObjectProps<T>) {
    this.checkIfEmpty(props);
    this.validate(props);
    this.props = props;
  }

  protected abstract validate(props: ValueObjectProps<T>): void;

  static isValueObject(obj: unknown): obj is ValueObject<unknown> {
    return obj instanceof ValueObject;
  }

  unpack(): T {
    if (this.isDomainPrimitive(this.props)) {
      return this.props.value;
    }

    return this.props as T;
  }

  equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }

    return JSON.stringify(this.unpack()) === JSON.stringify(vo.unpack());
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

  private isPrimitiveValue(value: unknown): value is Primitives | Date {
    return (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value instanceof Date
    );
  }

  private checkIfEmpty(props: ValueObjectProps<T>): void {
    if (props === null || props === undefined) {
      throw new Error('Value object props cannot be empty');
    }
  }
}
