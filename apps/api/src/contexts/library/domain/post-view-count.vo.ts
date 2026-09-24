import { InvariantViolationError } from '@core/errors';
import { ValueObject, type DomainPrimitive } from '@kernels/domain';

export class PostViewCount extends ValueObject<number> {
  private constructor(props: DomainPrimitive<number>) {
    super(props);
  }

  static of(value: number): PostViewCount {
    return new PostViewCount({ value });
  }

  protected validate(props: DomainPrimitive<number>): void {
    if (!PostViewCount.isValid(props)) {
      throw new InvariantViolationError({
        code: 'post.invalid_view_count',
        message: 'Post view count must be a non-negative integer',
        details: { fields: ['viewCount'] },
      });
    }
  }

  increment(): PostViewCount {
    return PostViewCount.of(this.unpack() + 1);
  }

  private static isValid(props: DomainPrimitive<number>): boolean {
    return Number.isInteger(props.value) && props.value >= 0;
  }
}
