import { err, ok, type Result } from '@core/result';
import {
  DOMAIN_ERROR_KIND,
  ValueObject,
  type DomainError,
  type DomainPrimitive,
} from '@kernels/domain';

export class PostContent extends ValueObject<string> {
  static of(value: string): Result<PostContent, DomainError> {
    return super.construct({
      props: { value: value.trim() },
      validate: (props) => PostContent.validateProps(props),
      instantiate: (props) => new PostContent(props),
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
        code: 'post.content_empty',
        message: 'Post content cannot be empty',
        details: { fields: ['content'] },
      });
    }

    return ok(props);
  }
}
