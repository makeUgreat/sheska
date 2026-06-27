import { type Result } from '@core/result';
import { Source, type SourceDomainError } from '@contexts/sources/domain';
import { type SourceInsert, type SourceRow } from './schema';

export class SourcePersistenceMapper {
  static toDomain(
    this: void,
    row: SourceRow,
  ): Result<Source, SourceDomainError> {
    return Source.restore({
      id: row.id,
      externalSourceId: row.externalSourceId,
      content: row.content,
      fingerprint: row.fingerprint,
      size: row.sizeBytes,
    });
  }

  static toInsert(source: Source): SourceInsert {
    const props = source.getProps();

    return {
      id: source.id,
      externalSourceId: props.externalSourceId.value,
      content: props.contentSnapshot.value.content,
      fingerprint: props.contentSnapshot.value.fingerprint,
      sizeBytes: props.contentSnapshot.value.size,
    };
  }
}
