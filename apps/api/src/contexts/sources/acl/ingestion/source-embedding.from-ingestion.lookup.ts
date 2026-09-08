import { type SourceEmbeddingLookup as IngestionSourceEmbeddingLookup } from '@contexts/ingestion';
import {
  type SourceEmbeddingLookup,
  type SourceEmbeddingMetadata,
} from '@contexts/sources/application/ports';

export class SourceEmbeddingFromIngestionLookup implements SourceEmbeddingLookup {
  constructor(
    private readonly ingestionLookup: IngestionSourceEmbeddingLookup,
  ) {}

  async find({
    sourceId,
  }: {
    sourceId: string;
  }): Promise<SourceEmbeddingMetadata | null> {
    return this.ingestionLookup.find({ sourceId });
  }
}
