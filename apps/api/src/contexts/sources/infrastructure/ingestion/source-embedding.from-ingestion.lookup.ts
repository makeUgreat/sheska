import { type SourceEmbeddingRepository } from '@contexts/ingestion/ingestion.di-tokens';
import {
  type SourceEmbeddingLookup,
  type EmbeddingInfo,
} from '@contexts/sources/application/ports';

export class SourceEmbeddingFromIngestionLookup implements SourceEmbeddingLookup {
  constructor(private readonly sourceEmbeddings: SourceEmbeddingRepository) {}

  async find({
    sourceId,
  }: {
    sourceId: string;
  }): Promise<EmbeddingInfo | null> {
    const embedding = await this.sourceEmbeddings.find({ sourceId });
    if (!embedding) return null;
    const props = embedding.getProps();
    return {
      model: props.model.unpack(),
      dimensions: props.model.expectedDimensions,
      createdAt: embedding.createdAt,
      updatedAt: embedding.updatedAt,
    };
  }
}
