import { err, ok, type Result } from '@core/result';
import {
  DOMAIN_ERROR_KIND,
  ValueObject,
  type DomainPrimitive,
} from '@kernels/domain';
import { type PostTitleDomainError } from './post-title.error';

export class PostTitle extends ValueObject<string> {
  private constructor(props: DomainPrimitive<string>) {
    super(props);
  }

  static of(value: string): Result<PostTitle, PostTitleDomainError> {
    return PostTitle.construct({
      props: { value: value.trim() },
      validate: (props) => PostTitle.validateProps(props),
    });
  }

  private static validateProps(
    props: DomainPrimitive<string>,
  ): Result<DomainPrimitive<string>, PostTitleDomainError> {
    if (props.value.length === 0) {
      return err({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'post.title_empty',
        message: 'Post title cannot be empty',
        details: { fields: ['title'] },
      } satisfies PostTitleDomainError);
    }

    return ok(props);
  }
}
