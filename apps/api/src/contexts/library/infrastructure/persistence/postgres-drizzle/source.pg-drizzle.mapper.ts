import { Source } from '@contexts/library/domain';
import { type SourceInsert, type SourceRow } from './schema';

export class SourcePgDrizzleMapper {
  static toDomain(this: void, row: SourceRow): Source {
    return Source.restore({
      id: row.id,
      externalSourceId: row.externalSourceId,
      frontmatter: row.frontmatter,
      title: row.title,
      body: row.body,
      fingerprint: row.fingerprint,
      size: row.sizeBytes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toInsert(source: Source): SourceInsert {
    const props = source.getProps();
    const contentSnapshot = props.contentSnapshot.unpack();

    return {
      id: source.id,
      externalSourceId: props.externalSourceId.unpack(),
      frontmatter: contentSnapshot.frontmatter,
      title: contentSnapshot.title,
      body: contentSnapshot.body,
      fingerprint: contentSnapshot.fingerprint,
      sizeBytes: contentSnapshot.size,
    };
  }
}
