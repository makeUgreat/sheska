import { Source } from '@contexts/sources/domain';
import { type SourceInsert, type SourceRow } from './schema';

export class SourcePersistenceMapper {
  static toDomain(this: void, row: SourceRow): Source {
    return Source.restore({
      id: row.id,
      externalSourceId: row.externalSourceId,
      content: row.content,
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
      content: contentSnapshot.content,
      fingerprint: contentSnapshot.fingerprint,
      sizeBytes: contentSnapshot.size,
    };
  }
}
