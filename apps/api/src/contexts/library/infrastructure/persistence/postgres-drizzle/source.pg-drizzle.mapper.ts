import { Source } from '@contexts/library/domain';
import { type SourceInsert, type SourceRow } from './schema';

export class SourcePgDrizzleMapper {
  static toDomain(this: void, row: SourceRow): Source {
    return Source.restore({
      id: row.id,
      externalSourceId: row.externalSourceId,
      frontmatter: row.frontmatter,
      body: row.body,
      fingerprint: row.fingerprint,
      size: row.sizeBytes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toInsert(source: Source): SourceInsert {
    const { externalSourceId, frontmatter, body, size } = source.getProps();
    const { text, fingerprint } = body.unpack();

    return {
      id: source.id,
      externalSourceId: externalSourceId.unpack(),
      frontmatter: frontmatter.unpack(),
      title: source.title(),
      body: text,
      fingerprint: fingerprint.unpack(),
      sizeBytes: size.unpack(),
    };
  }
}
