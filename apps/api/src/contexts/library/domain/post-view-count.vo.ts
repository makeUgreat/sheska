import {
  DomainException,
  DOMAIN_ERROR_KIND,
  ValueObject,
  type DomainPrimitive,
} from '@kernels/domain';

export class PostViewCount extends ValueObject<number> {
  constructor(props: DomainPrimitive<number>) {
    super(props);
  }

  static of(value: number): PostViewCount {
    return new PostViewCount({ value });
  }

  protected validate(props: DomainPrimitive<number>): void {
    if (!PostViewCount.isValid(props)) {
      throw new DomainException({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
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
