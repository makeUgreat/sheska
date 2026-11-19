import { InvariantViolationError } from '@core/errors';
import { ValueObject, type DomainPrimitive } from '@kernels/domain';

const NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;

export class ApiTokenName extends ValueObject<string> {
  private constructor(props: DomainPrimitive<string>) {
    super(props);
  }

  static of(value: string): ApiTokenName {
    return new ApiTokenName({ value: value.trim() });
  }

  protected validate(props: DomainPrimitive<string>): void {
    if (NAME_PATTERN.test(props.value)) return;

    throw new InvariantViolationError({
      code: 'api_token.invalid_name',
      message: 'API token name must be 1-32 lowercase letters, digits, or hyphens',
      details: { fields: ['name'] },
    });
  }
}
