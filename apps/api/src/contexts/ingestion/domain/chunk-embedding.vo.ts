import {
  DomainException,
  DOMAIN_ERROR_KIND,
  ValueObject,
} from '@kernels/domain';
import { EmbeddingVector } from './embedding-vector.vo';

interface ChunkEmbeddingProps {
  chunkIndex: number;
  chunkContent: string;
  embedding: EmbeddingVector;
}

export class ChunkEmbedding extends ValueObject<ChunkEmbeddingProps> {
  static of(params: ChunkEmbeddingProps): ChunkEmbedding {
    return new ChunkEmbedding(params);
  }

  protected validate(props: ChunkEmbeddingProps): void {
    if (!Number.isInteger(props.chunkIndex) || props.chunkIndex < 0) {
      throw new DomainException({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'ingestion.chunk_embedding.invalid_chunk_index',
        message: `Chunk index must be a non-negative integer, got ${props.chunkIndex}`,
        details: { fields: ['chunkIndex'] },
      });
    }
  }
}
