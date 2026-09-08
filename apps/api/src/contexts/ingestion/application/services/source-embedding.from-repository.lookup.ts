import { Inject, Injectable } from '@nestjs/common';
import { type SourceEmbeddingRepository } from '@contexts/ingestion/domain';
import {
  type SourceEmbeddingLookup,
  type EmbeddingMetadata,
} from '@contexts/ingestion/application/ports';
import { SOURCE_EMBEDDING_REPOSITORY } from '@contexts/ingestion/ingestion.di-tokens';

@Injectable()
export class SourceEmbeddingFromRepositoryLookup implements SourceEmbeddingLookup {
  constructor(
    @Inject(SOURCE_EMBEDDING_REPOSITORY)
    private readonly sourceEmbeddings: SourceEmbeddingRepository,
  ) {}

  async find({
    sourceId,
  }: {
    sourceId: string;
  }): Promise<EmbeddingMetadata | null> {
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
