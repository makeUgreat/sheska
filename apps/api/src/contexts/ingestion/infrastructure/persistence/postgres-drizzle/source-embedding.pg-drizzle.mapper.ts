import { SourceEmbedding } from '@contexts/ingestion/domain';
import { type SourceEmbeddingInsert, type SourceEmbeddingRow } from './schema';

export class SourceEmbeddingPgDrizzleMapper {
  static toDomain(rows: SourceEmbeddingRow[]): SourceEmbedding {
    const first = rows[0];
    return SourceEmbedding.restore({
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

  static toInserts(sourceEmbedding: SourceEmbedding): SourceEmbeddingInsert[] {
    const props = sourceEmbedding.getProps();
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
