import { ValueObject, type DomainPrimitive } from '@kernels/domain';

export class SourceSize extends ValueObject<number> {
  constructor(props: DomainPrimitive<number>) {
    super(props);
  }

  static of(value: number): SourceSize {
    return new SourceSize({ value });
  }

  protected validate(props: DomainPrimitive<number>): void {
    if (!SourceSize.isValid(props)) {
      throw new Error('Source size must be a non-negative integer');
    }
  }

  private static isValid(props: DomainPrimitive<number>): boolean {
    return Number.isInteger(props.value) && props.value >= 0;
  }
}
