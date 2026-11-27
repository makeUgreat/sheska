import { InvariantViolationError } from '@core/errors';
import { Source, type SourceSeriesProps } from '@contexts/library/domain';
import { type SourceInsert, type SourceRow } from './schema';

export class SourcePgDrizzleMapper {
  static toDomain(this: void, row: SourceRow): Source {
    return Source.restore({
      id: row.id,
      externalSourceId: row.externalSourceId,
      frontmatter: row.frontmatter,
      series: SourcePgDrizzleMapper.toSeries(row),
      body: row.body,
      fingerprint: row.fingerprint,
      size: row.sizeBytes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toInsert(source: Source): SourceInsert {
    const { externalSourceId, frontmatter, series, body, size } = source.getProps();
    const { text, fingerprint } = body.unpack();
    const seriesProps = series.unpack();

    return {
      id: source.id,
      externalSourceId: externalSourceId.unpack(),
      frontmatter: frontmatter.unpack(),
      series: seriesProps.kind === 'member' ? seriesProps.name : null,
      seriesOrder: seriesProps.kind === 'member' ? seriesProps.order : null,
      title: source.title(),
      body: text,
      fingerprint: fingerprint.unpack(),
      sizeBytes: size.unpack(),
    };
  }

  private static toSeries(this: void, row: Pick<SourceRow, 'series' | 'seriesOrder'>): SourceSeriesProps {
    if (row.series === null && row.seriesOrder === null) {
      return { kind: 'none' };
    }

    if (row.series !== null && row.seriesOrder !== null) {
      return { kind: 'member', name: row.series, order: row.seriesOrder };
    }

    throw new InvariantViolationError({
      code: 'source.partial_series',
      message: 'A stored source must have both series and series_order, or neither',
      details: { fields: ['series', 'seriesOrder'] },
    });
  }
}
