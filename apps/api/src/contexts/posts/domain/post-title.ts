import { err, ok, type Result } from '@core/result';
import {
  DOMAIN_ERROR_KIND,
  ValueObject,
  type DomainError,
  type DomainPrimitive,
} from '@kernels/domain';

export class PostTitle extends ValueObject<string> {
  static of(value: string): Result<PostTitle, DomainError> {
    return super.construct({
      props: { value: value.trim() },
      validate: (props) => PostTitle.validateProps(props),
      instantiate: (props) => new PostTitle(props),
    });
  }

  private constructor(props: DomainPrimitive<string>) {
    super(props);
  }

  private static validateProps(
    props: DomainPrimitive<string>,
  ): Result<DomainPrimitive<string>, DomainError> {
    if (props.value.length === 0) {
      return err({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'post.title_empty',
        message: 'Post title cannot be empty',
        details: { fields: ['title'] },
      });
    }

    return ok(props);
  }
}
