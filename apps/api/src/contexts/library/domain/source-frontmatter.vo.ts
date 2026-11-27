import { InvariantViolationError, ValidationFailedError } from '@core/errors';
import { ValueObject } from '@kernels/domain';
import { Guard } from '@core/guard';

export type SourceFrontmatterValue =
  null | string | number | boolean | SourceFrontmatterValue[] | { readonly [key: string]: SourceFrontmatterValue };

export type SourceFrontmatterProps = Readonly<Record<string, SourceFrontmatterValue>>;

export class SourceFrontmatter extends ValueObject<SourceFrontmatterProps> {
  private constructor(props: SourceFrontmatterProps) {
    super(props);
  }

  static of(value: SourceFrontmatterProps): SourceFrontmatter {
    return new SourceFrontmatter(value);
  }

  static parse(value: SourceFrontmatterProps): SourceFrontmatter {
    if (value.sheska !== true) {
      throw new ValidationFailedError({
        code: 'source.not_sync_target',
        message: 'Only a file whose frontmatter has `sheska: true` can be uploaded',
        details: {
          fields: [{ path: 'frontmatter.sheska', messages: ['must be true'] }],
        },
      });
    }

    return new SourceFrontmatter(value);
  }

  protected validate(props: SourceFrontmatterProps): void {
    if (!Guard.isPlainObject(props)) {
      throw new InvariantViolationError({
        code: 'source.invalid_frontmatter',
        message: 'Source frontmatter must be a JSON object',
        details: { fields: ['frontmatter'] },
      });
    }
  }
}
