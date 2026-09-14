import {
  DomainException,
  DOMAIN_ERROR_KIND,
  ValueObject,
} from '@kernels/domain';
import { Guard } from '@core/guard';

export type SourceFrontmatterValue =
  | null
  | string
  | number
  | boolean
  | SourceFrontmatterValue[]
  | { readonly [key: string]: SourceFrontmatterValue };

export type SourceFrontmatterProps = Readonly<
  Record<string, SourceFrontmatterValue>
>;

export class SourceFrontmatter extends ValueObject<SourceFrontmatterProps> {
  private constructor(props: SourceFrontmatterProps) {
    super(props);
  }

  static of(value: SourceFrontmatterProps): SourceFrontmatter {
    return new SourceFrontmatter(value);
  }

  protected validate(props: SourceFrontmatterProps): void {
    if (!Guard.isPlainObject(props)) {
      throw new DomainException({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'source.invalid_frontmatter',
        message: 'Source frontmatter must be a JSON object',
        details: { fields: ['frontmatter'] },
      });
    }
  }
}
