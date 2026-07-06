import { AggregateRoot } from '@kernels/domain';
import { EmbeddingModel } from './embedding-model.vo';
import { EmbeddingVector } from './embedding-vector.vo';

interface SourceVectorProps {
  sourceId: string;
  embedding: EmbeddingVector;
  model: EmbeddingModel;
}

interface SourceVectorCreateParams {
  sourceId: string;
  embedding: number[];
  model: string;
}

interface SourceVectorRestoreParams {
  sourceId: string;
  embedding: number[];
  model: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class SourceVector extends AggregateRoot<SourceVectorProps> {
  static create(params: SourceVectorCreateParams): SourceVector {
    const model = EmbeddingModel.of(params.model);
    return new SourceVector({
      id: params.sourceId,
      props: {
        sourceId: params.sourceId,
        embedding: EmbeddingVector.of(params.embedding, model),
        model,
      },
    });
  }

  static restore(params: SourceVectorRestoreParams): SourceVector {
    const model = EmbeddingModel.of(params.model);
    return new SourceVector({
      id: params.sourceId,
      props: {
        sourceId: params.sourceId,
        embedding: EmbeddingVector.of(params.embedding, model),
        model,
      },
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    });
  }

  public validate(): void {}
}
