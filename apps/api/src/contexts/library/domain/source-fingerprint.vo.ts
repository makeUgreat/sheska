import { InvariantViolationError } from '@core/errors';
import { ValueObject, type DomainPrimitive } from '@kernels/domain';

export class SourceFingerprint extends ValueObject<string> {
  private constructor(props: DomainPrimitive<string>) {
    super(props);
  }

  static of(value: string): SourceFingerprint {
    const props = { value: value.trim() };

    return new SourceFingerprint(props);
  }

  protected validate(props: DomainPrimitive<string>): void {
    if (SourceFingerprint.isEmpty(props)) {
      throw new InvariantViolationError({
        code: 'source.empty_fingerprint',
        message: 'Source fingerprint cannot be empty',
        details: { fields: ['fingerprint'] },
      });
    }
  }

  private static isEmpty(props: DomainPrimitive<string>): boolean {
    return props.value.length === 0;
  }
}
