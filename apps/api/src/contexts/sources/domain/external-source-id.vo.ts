import { err, ok, type Result } from '@core/result';
import {
  DOMAIN_ERROR_KIND,
  ValueObject,
  type DomainPrimitive,
} from '@kernels/domain';
import { type ExternalSourceIdDomainError } from './external-source-id.error';

export class ExternalSourceId extends ValueObject<string> {
  private constructor(props: DomainPrimitive<string>) {
    super(props);
  }

  static of(
    value: string,
  ): Result<ExternalSourceId, ExternalSourceIdDomainError> {
    return ExternalSourceId.construct({
      props: { value: value.trim() },
      validate: (props) => ExternalSourceId.validateProps(props),
    });
  }

  private static validateProps(
    props: DomainPrimitive<string>,
  ): Result<DomainPrimitive<string>, ExternalSourceIdDomainError> {
    if (props.value.length === 0) {
      return err({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'external_source.id_empty',
        message: 'External source id cannot be empty',
        details: { fields: ['externalSourceId'] },
      } satisfies ExternalSourceIdDomainError);
    }

    return ok(props);
  }
}
