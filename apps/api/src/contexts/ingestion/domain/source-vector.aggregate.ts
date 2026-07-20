import { AggregateRoot } from '@kernels/domain';
import { ChunkVector } from './chunk-vector.vo';
import { EmbeddingModel } from './embedding-model.vo';
import { EmbeddingVector } from './embedding-vector.vo';

interface SourceVectorProps {
  sourceId: string;
  model: EmbeddingModel;
  chunks: ChunkVector[];
}

interface ChunkParam {
  chunkIndex: number;
  chunkContent: string;
  embedding: number[];
}

interface SourceVectorCreateParams {
  sourceId: string;
  model: string;
  chunks: ChunkParam[];
}

interface SourceVectorRestoreParams {
  sourceId: string;
  model: string;
  chunks: ChunkParam[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class SourceVector extends AggregateRoot<SourceVectorProps> {
  static create(params: SourceVectorCreateParams): SourceVector {
    const model = EmbeddingModel.of(params.model);
    const chunks = params.chunks.map((c) =>
      ChunkVector.of({
        chunkIndex: c.chunkIndex,
        chunkContent: c.chunkContent,
        embedding: EmbeddingVector.of(c.embedding, model),
      }),
    );
    return new SourceVector({
      id: params.sourceId,
      props: { sourceId: params.sourceId, model, chunks },
    });
  }

  static restore(params: SourceVectorRestoreParams): SourceVector {
    const model = EmbeddingModel.of(params.model);
    const chunks = params.chunks.map((c) =>
      ChunkVector.of({
        chunkIndex: c.chunkIndex,
        chunkContent: c.chunkContent,
        embedding: EmbeddingVector.of(c.embedding, model),
      }),
    );
    return new SourceVector({
      id: params.sourceId,
      props: { sourceId: params.sourceId, model, chunks },
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    });
  }

  public validate(): void {}
}
