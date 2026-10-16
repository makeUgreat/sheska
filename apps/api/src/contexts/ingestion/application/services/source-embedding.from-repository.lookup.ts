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
    const model = embedding?.getProps().model;
    if (!embedding || !model) return null;
    return {
      model: model.unpack(),
      dimensions: model.expectedDimensions,
      createdAt: embedding.createdAt,
      updatedAt: embedding.updatedAt,
    };
  }
}
