import { InvariantViolationError, ValidationFailedError } from '@core/errors';
import { ValueObject } from '@kernels/domain';
import { type SourceFrontmatterProps, type SourceFrontmatterValue } from './source-frontmatter.vo';

export type SourceSeriesProps = { readonly kind: 'none' } | { readonly kind: 'member'; readonly name: string; readonly order: number };

export class SourceSeries extends ValueObject<SourceSeriesProps> {
  private constructor(props: SourceSeriesProps) {
    super(props);
  }

  static none(): SourceSeries {
    return new SourceSeries({ kind: 'none' });
  }

  static of(props: SourceSeriesProps): SourceSeries {
    return new SourceSeries(props);
  }

  static parse(frontmatter: SourceFrontmatterProps): SourceSeries {
    const name = frontmatter.series ?? null;
    const order = frontmatter.series_order ?? null;
    if (name === null && order === null) return SourceSeries.none();

    if (!SourceSeries.isName(name)) {
      throw new ValidationFailedError({
        code: 'source.invalid_series',
        message: '`series` must be a non-empty string, set together with `series_order`',
        details: {
          fields: [{ path: 'frontmatter.series', messages: ['must be a non-empty string, set together with `series_order`'] }],
        },
      });
    }
    if (!SourceSeries.isOrder(order)) {
      throw new ValidationFailedError({
        code: 'source.invalid_series',
        message: '`series_order` must be an integer of 1 or more, set together with `series`',
        details: {
          fields: [{ path: 'frontmatter.series_order', messages: ['must be an integer of 1 or more, set together with `series`'] }],
        },
      });
    }

    return new SourceSeries({ kind: 'member', name: name.trim(), order });
  }

  protected validate(props: SourceSeriesProps): void {
    if (props.kind === 'none') return;

    if (!SourceSeries.isName(props.name) || props.name !== props.name.trim() || !SourceSeries.isOrder(props.order)) {
      throw new InvariantViolationError({
        code: 'source.invalid_series',
        message: 'Source series must have a trimmed non-empty name and an order of 1 or more',
        details: { fields: ['series'] },
      });
    }
  }

  private static isName(value: SourceFrontmatterValue): value is string {
    return typeof value === 'string' && value.trim() !== '';
  }

  private static isOrder(value: SourceFrontmatterValue): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 1;
  }
}
