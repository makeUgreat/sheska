import { InvariantViolationError, ValidationFailedError } from '@core/errors';
import { ValueObject } from '@kernels/domain';
import { type SourceFrontmatterProps, type SourceFrontmatterValue } from './source-frontmatter.vo';

export type SourceProjectProps = { readonly kind: 'none' } | { readonly kind: 'related'; readonly name: string };

export class SourceProject extends ValueObject<SourceProjectProps> {
  private constructor(props: SourceProjectProps) {
    super(props);
  }

  static none(): SourceProject {
    return new SourceProject({ kind: 'none' });
  }

  static of(props: SourceProjectProps): SourceProject {
    return new SourceProject(props);
  }

  static parse(frontmatter: SourceFrontmatterProps): SourceProject {
    const value = frontmatter.project ?? null;
    if (value === null) return SourceProject.none();

    if (!SourceProject.isText(value)) {
      throw new ValidationFailedError({
        code: 'source.invalid_project',
        message: '`project` must be a single string',
        details: {
          fields: [{ path: 'frontmatter.project', messages: ['must be a single string'] }],
        },
      });
    }

    const name = SourceProject.normalize(value);
    if (name === '') return SourceProject.none();

    return new SourceProject({ kind: 'related', name });
  }

  protected validate(props: SourceProjectProps): void {
    if (props.kind === 'none') return;

    if (props.name === '' || props.name !== SourceProject.normalize(props.name)) {
      throw new InvariantViolationError({
        code: 'source.invalid_project',
        message: 'Source project must be a non-empty, trimmed, lowercase name',
        details: { fields: ['project'] },
      });
    }
  }

  private static isText(value: SourceFrontmatterValue): value is string {
    return typeof value === 'string';
  }

  private static normalize(value: string): string {
    return value.trim().toLowerCase();
  }
}
