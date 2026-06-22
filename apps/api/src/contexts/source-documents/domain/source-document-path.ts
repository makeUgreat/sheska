import { err, ok, type Result } from '@core/result';
import {
  DOMAIN_ERROR_KIND,
  ValueObject,
  type DomainError,
  type DomainPrimitive,
} from '@kernels/domain';

export class SourceDocumentPath extends ValueObject<string> {
  static of(value: string): Result<SourceDocumentPath, DomainError> {
    return super.construct({
      props: { value: SourceDocumentPath.normalize(value) },
      validate: (props) => SourceDocumentPath.validateProps(props),
      instantiate: (props) => new SourceDocumentPath(props),
    });
  }

  private constructor(props: DomainPrimitive<string>) {
    super(props);
  }

  private static normalize(value: string): string {
    return value.trim().replaceAll('\\', '/').replace(/\/+/g, '/');
  }

  private static validateProps(
    props: DomainPrimitive<string>,
  ): Result<DomainPrimitive<string>, DomainError> {
    const segments = props.value.split('/');

    if (props.value.length === 0) {
      return err({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'source_document.path_empty',
        message: 'Source document path cannot be empty',
        details: { fields: ['path'] },
      });
    }

    if (props.value.startsWith('/') || segments.includes('..')) {
      return err({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'source_document.path_invalid',
        message: 'Source document path must be relative',
        details: { fields: ['path'] },
      });
    }

    if (!props.value.endsWith('.md')) {
      return err({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'source_document.path_not_markdown',
        message: 'Source document path must point to a Markdown document',
        details: { fields: ['path'] },
      });
    }

    return ok(props);
  }
}
