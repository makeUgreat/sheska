import { Source } from '@contexts/library/domain';
import {
  type SourceInsert,
  type SourceLinkInsert,
  type SourceLinkRow,
  type SourceRow,
} from './schema';

export class SourcePgDrizzleMapper {
  static toDomain(
    this: void,
    row: SourceRow,
    linkRows: readonly SourceLinkRow[],
  ): Source {
    return Source.restore({
      id: row.id,
      externalSourceId: row.externalSourceId,
      frontmatter: row.frontmatter,
      links: linkRows.map(({ target, resolvedPath }) => ({
        target,
        resolvedPath,
      })),
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
      frontmatter: contentSnapshot.frontmatter.unpack(),
      title: contentSnapshot.title,
      body: contentSnapshot.body,
      fingerprint: contentSnapshot.fingerprint.unpack(),
      sizeBytes: contentSnapshot.size.unpack(),
    };
  }

  static toLinkInserts(source: Source): SourceLinkInsert[] {
    const { links } = source.getProps().contentSnapshot.unpack();
    return links.links.map(({ target, resolvedPath }) => ({
      sourceId: source.id,
      target,
      resolvedPath,
    }));
  }
}
