import { randomBase64Url } from '@core/random';
import { sha256Hex } from '@core/hash';
import { ValueObject, type DomainPrimitive } from '@kernels/domain';

const PREFIX = 'shk_';
const RANDOM_BYTES = 32;
const HINT_LENGTH = PREFIX.length + 4;

export class ApiTokenSecret extends ValueObject<string> {
  private constructor(props: DomainPrimitive<string>) {
    super(props);
  }

  static generate(): ApiTokenSecret {
    const random = randomBase64Url(RANDOM_BYTES);
    return new ApiTokenSecret({ value: `${PREFIX}${random}` });
  }

  static of(value: string): ApiTokenSecret {
    return new ApiTokenSecret({ value });
  }

  hash(): string {
    return sha256Hex(this.props.value);
  }

  hint(): string {
    return this.props.value.slice(0, HINT_LENGTH);
  }

  protected validate(): void {}
}
