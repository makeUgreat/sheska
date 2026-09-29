import { InvariantViolationError } from '@core/errors';
import { ValueObject } from '@kernels/domain';
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

  equals(other?: SourceFrontmatter): boolean {
    if (!other) return false;
    return canonicalize(this.unpack()) === canonicalize(other.unpack());
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

function canonicalize(
  value: SourceFrontmatterValue | SourceFrontmatterProps,
): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}
