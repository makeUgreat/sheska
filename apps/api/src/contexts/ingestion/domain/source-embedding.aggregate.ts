import { InvariantViolationError } from '@core/errors';
import { AggregateRoot } from '@kernels/domain';
import { ChunkEmbedding } from './chunk-embedding.vo';
import { EmbeddingModel } from './embedding-model.vo';
import { EmbeddingVector } from './embedding-vector.vo';

interface SourceEmbeddingProps {
  sourceId: string;
  syncJobId: string;
  model: EmbeddingModel | null;
  chunks: ChunkEmbedding[];
}

interface ChunkParam {
  chunkIndex: number;
  chunkContent: string;
  embedding: number[];
}

interface SourceEmbeddingCreateParams {
  sourceId: string;
  syncJobId: string;
  model: string | null;
  chunks: ChunkParam[];
}

interface SourceEmbeddingRestoreParams extends SourceEmbeddingCreateParams {
  createdAt?: Date;
  updatedAt?: Date;
}

export class SourceEmbedding extends AggregateRoot<SourceEmbeddingProps> {
  static create(params: SourceEmbeddingCreateParams): SourceEmbedding {
    return new SourceEmbedding({
      id: params.sourceId,
      props: SourceEmbedding.buildProps(params),
    });
  }

  static restore(params: SourceEmbeddingRestoreParams): SourceEmbedding {
    return new SourceEmbedding({
      id: params.sourceId,
      props: SourceEmbedding.buildProps(params),
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    });
  }

  private static buildProps(
    params: SourceEmbeddingCreateParams,
  ): SourceEmbeddingProps {
    const model =
      params.model === null ? null : EmbeddingModel.of(params.model);
    const chunks = params.chunks.map((c) => {
      if (!model) throw SourceEmbedding.modelMismatch();
      return ChunkEmbedding.of({
        chunkIndex: c.chunkIndex,
        chunkContent: c.chunkContent,
        embedding: EmbeddingVector.of(c.embedding, model),
      });
    });
    return {
      sourceId: params.sourceId,
      syncJobId: params.syncJobId,
      model,
      chunks,
    };
  }

  private static modelMismatch(): InvariantViolationError {
    return new InvariantViolationError({
      code: 'ingestion.source_embedding.model_mismatch',
      message: 'Source embedding has a model exactly when it has chunks',
      details: { fields: ['model', 'chunks'] },
    });
  }

  public validate(): void {
    const { chunks, model } = this.props;
    const hasChunks = chunks.length > 0;
    if (hasChunks !== (model !== null)) {
      throw SourceEmbedding.modelMismatch();
    }
  }
}
