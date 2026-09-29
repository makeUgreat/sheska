import { InvariantViolationError } from '@core/errors';
import { ValueObject } from '@kernels/domain';

export interface SourceLink {
  readonly target: string;
  readonly resolvedPath: string | null;
}

interface SourceLinksProps {
  links: readonly SourceLink[];
}

export class SourceLinks extends ValueObject<SourceLinksProps> {
  private constructor(props: SourceLinksProps) {
    super(props);
  }

  static of(links: readonly SourceLink[]): SourceLinks {
    const byTarget = new Map<string, SourceLink>();
    for (const link of links) {
      const target = link.target.trim();
      if (!byTarget.has(target)) {
        byTarget.set(target, { target, resolvedPath: link.resolvedPath });
      }
    }
    return new SourceLinks({ links: [...byTarget.values()] });
  }

  get links(): readonly SourceLink[] {
    return this.props.links;
  }

  equals(other?: SourceLinks): boolean {
    if (!other) return false;
    return (
      JSON.stringify(sortByTarget(this.props.links)) ===
      JSON.stringify(sortByTarget(other.props.links))
    );
  }

  protected validate(props: SourceLinksProps): void {
    if (props.links.some((link) => link.target.length === 0)) {
      throw new InvariantViolationError({
        code: 'source.empty_link_target',
        message: 'Source link target cannot be empty',
        details: { fields: ['links'] },
      });
    }
  }
}

function sortByTarget(links: readonly SourceLink[]): SourceLink[] {
  return [...links].sort((left, right) =>
    left.target < right.target ? -1 : left.target > right.target ? 1 : 0,
  );
}
