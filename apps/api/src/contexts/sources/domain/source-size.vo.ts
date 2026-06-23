import { err, ok, type Result } from '@core/result';
import {
  DOMAIN_ERROR_KIND,
  ValueObject,
  type DomainPrimitive,
} from '@kernels/domain';
import { type SourceSizeDomainError } from './source-size.error';

export class SourceSize extends ValueObject<number> {
  private constructor(props: DomainPrimitive<number>) {
    super(props);
  }

  static of(value: number): Result<SourceSize, SourceSizeDomainError> {
    return SourceSize.construct({
      props: { value },
      validate: (props) => SourceSize.validateProps(props),
    });
  }

  private static validateProps(
    props: DomainPrimitive<number>,
  ): Result<DomainPrimitive<number>, SourceSizeDomainError> {
    if (Number.isInteger(props.value) && props.value >= 0) {
      return ok(props);
    }

    return err({
      kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
      code: 'source.size_invalid',
      message: 'Source size must be a non-negative integer',
      details: { fields: ['size'] },
    } satisfies SourceSizeDomainError);
  }
}
