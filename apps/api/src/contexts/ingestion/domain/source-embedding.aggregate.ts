import { AggregateRoot } from '@kernels/domain';
import { ChunkEmbedding } from './chunk-embedding.vo';
import { EmbeddingModel } from './embedding-model.vo';
import { EmbeddingVector } from './embedding-vector.vo';

interface SourceEmbeddingProps {
  sourceId: string;
  model: EmbeddingModel;
  chunks: ChunkEmbedding[];
}

interface ChunkParam {
  chunkIndex: number;
  chunkContent: string;
  embedding: number[];
}

interface SourceEmbeddingCreateParams {
  sourceId: string;
  model: string;
  chunks: ChunkParam[];
}

interface SourceEmbeddingRestoreParams {
  sourceId: string;
  model: string;
  chunks: ChunkParam[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class SourceEmbedding extends AggregateRoot<SourceEmbeddingProps> {
  static create(params: SourceEmbeddingCreateParams): SourceEmbedding {
    const model = EmbeddingModel.of(params.model);
    const chunks = params.chunks.map((c) =>
      ChunkEmbedding.of({
        chunkIndex: c.chunkIndex,
        chunkContent: c.chunkContent,
        embedding: EmbeddingVector.of(c.embedding, model),
      }),
    );
    return new SourceEmbedding({
      id: params.sourceId,
      props: { sourceId: params.sourceId, model, chunks },
    });
  }

  static restore(params: SourceEmbeddingRestoreParams): SourceEmbedding {
    const model = EmbeddingModel.of(params.model);
    const chunks = params.chunks.map((c) =>
      ChunkEmbedding.of({
        chunkIndex: c.chunkIndex,
        chunkContent: c.chunkContent,
        embedding: EmbeddingVector.of(c.embedding, model),
      }),
    );
    return new SourceEmbedding({
      id: params.sourceId,
      props: { sourceId: params.sourceId, model, chunks },
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    });
  }

  public validate(): void {}
}
