import {
  DomainException,
  DOMAIN_ERROR_KIND,
  ValueObject,
  type DomainPrimitive,
} from '@kernels/domain';

export class PostTitle extends ValueObject<string> {
  constructor(props: DomainPrimitive<string>) {
    super(props);
  }

  static of(value: string): PostTitle {
    return new PostTitle({ value: value.trim() });
  }

  protected validate(props: DomainPrimitive<string>): void {
    if (!PostTitle.isValid(props)) {
      throw new DomainException({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'post.invalid_title',
        message: 'Post title must be between 1 and 200 characters',
        details: { fields: ['title'] },
      });
    }
  }

  private static isValid(props: DomainPrimitive<string>): boolean {
    return props.value.length >= 1 && props.value.length <= 200;
  }
}
