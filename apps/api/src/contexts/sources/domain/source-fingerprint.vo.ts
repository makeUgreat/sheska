import { err, ok, type Result } from '@core/result';
import {
  DOMAIN_ERROR_KIND,
  ValueObject,
  type DomainPrimitive,
} from '@kernels/domain';
import { type SourceFingerprintDomainError } from './source-fingerprint.error';

export class SourceFingerprint extends ValueObject<string> {
  private constructor(props: DomainPrimitive<string>) {
    super(props);
  }

  static of(
    value: string,
  ): Result<SourceFingerprint, SourceFingerprintDomainError> {
    return SourceFingerprint.construct({
      props: { value: value.trim() },
      validate: (props) => SourceFingerprint.validateProps(props),
    });
  }

  private static validateProps(
    props: DomainPrimitive<string>,
  ): Result<DomainPrimitive<string>, SourceFingerprintDomainError> {
    if (props.value.length === 0) {
      return err({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'source.fingerprint_empty',
        message: 'Source fingerprint cannot be empty',
        details: { fields: ['fingerprint'] },
      } satisfies SourceFingerprintDomainError);
    }

    return ok(props);
  }
}
