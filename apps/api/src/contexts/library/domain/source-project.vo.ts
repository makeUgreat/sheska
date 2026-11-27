import { InvariantViolationError, ValidationFailedError } from '@core/errors';
import { ValueObject } from '@kernels/domain';
import { type SourceFrontmatterProps, type SourceFrontmatterValue } from './source-frontmatter.vo';

export type SourceProjectSlug = 'sheska' | 'siru' | 'nocap' | 'home-cluster';

const PROJECT_SLUGS: readonly SourceProjectSlug[] = ['sheska', 'siru', 'nocap', 'home-cluster'];

export type SourceProjectProps = { readonly kind: 'none' } | { readonly kind: 'related'; readonly slug: SourceProjectSlug };

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

    if (!SourceProject.isSlug(value)) {
      throw new ValidationFailedError({
        code: 'source.invalid_project',
        message: `\`project\` must be one of ${PROJECT_SLUGS.join(', ')}`,
        details: {
          fields: [{ path: 'frontmatter.project', messages: [`must be one of ${PROJECT_SLUGS.join(', ')}`] }],
        },
      });
    }

    return new SourceProject({ kind: 'related', slug: value });
  }

  protected validate(props: SourceProjectProps): void {
    if (props.kind === 'none') return;

    if (!SourceProject.isSlug(props.slug)) {
      throw new InvariantViolationError({
        code: 'source.invalid_project',
        message: `Source project must be one of ${PROJECT_SLUGS.join(', ')}`,
        details: { fields: ['project'] },
      });
    }
  }

  private static isSlug(value: SourceFrontmatterValue): value is SourceProjectSlug {
    return PROJECT_SLUGS.some((slug) => slug === value);
  }
}
