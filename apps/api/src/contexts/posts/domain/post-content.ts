import { err, ok, type Result } from '@core/result';
import {
  DOMAIN_ERROR_KIND,
  ValueObject,
  type DomainPrimitive,
} from '@kernels/domain';
import { type PostContentDomainError } from './post-content.error';

export class PostContent extends ValueObject<string> {
  private constructor(props: DomainPrimitive<string>) {
    super(props);
  }

  static of(value: string): Result<PostContent, PostContentDomainError> {
    return PostContent.construct({
      props: { value: value.trim() },
      validate: (props) => PostContent.validateProps(props),
    });
  }

  private static validateProps(
    props: DomainPrimitive<string>,
  ): Result<DomainPrimitive<string>, PostContentDomainError> {
    if (props.value.length === 0) {
      return err({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'post.content_empty',
        message: 'Post content cannot be empty',
        details: { fields: ['content'] },
      } satisfies PostContentDomainError);
    }

    return ok(props);
  }
}
