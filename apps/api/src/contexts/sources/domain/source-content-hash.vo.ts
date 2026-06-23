import { err, ok, type Result } from '@core/result';
import {
  DOMAIN_ERROR_KIND,
  ValueObject,
  type DomainPrimitive,
} from '@kernels/domain';
import { type SourceContentHashDomainError } from './source-content-hash.error';

export class SourceContentHash extends ValueObject<string> {
  private constructor(props: DomainPrimitive<string>) {
    super(props);
  }

  static of(
    value: string,
  ): Result<SourceContentHash, SourceContentHashDomainError> {
    return SourceContentHash.construct({
      props: { value: value.trim() },
      validate: (props) => SourceContentHash.validateProps(props),
    });
  }

  private static validateProps(
    props: DomainPrimitive<string>,
  ): Result<DomainPrimitive<string>, SourceContentHashDomainError> {
    if (props.value.length === 0) {
      return err({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'source.content_hash_empty',
        message: 'Source content hash cannot be empty',
        details: { fields: ['contentHash'] },
      } satisfies SourceContentHashDomainError);
    }

    return ok(props);
  }
}
