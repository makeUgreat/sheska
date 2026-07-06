import { SourceVector } from '@contexts/ingestion/domain';
import { type SourceVectorInsert, type SourceVectorRow } from './schema';

export class SourceVectorPgDrizzleMapper {
  static toDomain(row: SourceVectorRow): SourceVector {
    return SourceVector.restore({
      sourceId: row.sourceId,
      embedding: row.embedding,
      model: row.model,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toInsert(sourceVector: SourceVector): SourceVectorInsert {
    const props = sourceVector.getProps();

    return {
      sourceId: props.sourceId,
      embedding: props.embedding.unpack().values,
      model: props.model.unpack(),
    };
  }
}
