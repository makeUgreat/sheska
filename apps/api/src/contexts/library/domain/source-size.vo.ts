import {
  DomainException,
  DOMAIN_ERROR_KIND,
  ValueObject,
  type DomainPrimitive,
} from '@kernels/domain';

export class SourceSize extends ValueObject<number> {
  constructor(props: DomainPrimitive<number>) {
    super(props);
  }

  static of(value: number): SourceSize {
    return new SourceSize({ value });
  }

  protected validate(props: DomainPrimitive<number>): void {
    if (!SourceSize.isValid(props)) {
      throw new DomainException({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'source.invalid_size',
        message: 'Source size must be a non-negative integer',
        details: { fields: ['size'] },
      });
    }
  }

  private static isValid(props: DomainPrimitive<number>): boolean {
    return Number.isInteger(props.value) && props.value >= 0;
  }
}
