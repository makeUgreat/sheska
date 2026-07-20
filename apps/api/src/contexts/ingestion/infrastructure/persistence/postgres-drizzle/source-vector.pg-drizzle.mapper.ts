import { SourceVector } from '@contexts/ingestion/domain';
import { type SourceVectorInsert, type SourceVectorRow } from './schema';

export class SourceVectorPgDrizzleMapper {
  static toDomain(rows: SourceVectorRow[]): SourceVector {
    const first = rows[0];
    return SourceVector.restore({
      sourceId: first.sourceId,
      model: first.model,
      chunks: rows.map((row) => ({
        chunkIndex: row.chunkIndex,
        chunkContent: row.chunkContent,
        embedding: row.embedding,
      })),
      createdAt: first.createdAt,
      updatedAt: rows[rows.length - 1].updatedAt,
    });
  }

  static toInserts(sourceVector: SourceVector): SourceVectorInsert[] {
    const props = sourceVector.getProps();
    const model = props.model.unpack();

    return props.chunks.map((chunk) => {
      const c = chunk.unpack();
      return {
        sourceId: props.sourceId,
        chunkIndex: c.chunkIndex,
        chunkContent: c.chunkContent,
        embedding: c.embedding.unpack().values,
        model,
      };
    });
  }
}
