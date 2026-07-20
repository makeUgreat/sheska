import { type SourceVectorRepository } from '@contexts/ingestion/ingestion.di-tokens';
import {
  type SourceEmbeddingLookup,
  type EmbeddingInfo,
} from '@contexts/sources/application/ports';

export class SourceEmbeddingIngestionLookup implements SourceEmbeddingLookup {
  constructor(private readonly sourceVectors: SourceVectorRepository) {}

  async find({
    sourceId,
  }: {
    sourceId: string;
  }): Promise<EmbeddingInfo | null> {
    const vector = await this.sourceVectors.find({ sourceId });
    if (!vector) return null;
    const props = vector.getProps();
    return {
      model: props.model.unpack(),
      dimensions: props.model.expectedDimensions,
      createdAt: vector.createdAt,
      updatedAt: vector.updatedAt,
    };
  }
}
