import {
  DomainException,
  DOMAIN_ERROR_KIND,
  ValueObject,
} from '@kernels/domain';
import { EmbeddingVector } from './embedding-vector.vo';

interface ChunkVectorProps {
  chunkIndex: number;
  chunkContent: string;
  embedding: EmbeddingVector;
}

export class ChunkVector extends ValueObject<ChunkVectorProps> {
  static of(params: ChunkVectorProps): ChunkVector {
    return new ChunkVector(params);
  }

  protected validate(props: ChunkVectorProps): void {
    if (!Number.isInteger(props.chunkIndex) || props.chunkIndex < 0) {
      throw new DomainException({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'ingestion.chunk_vector.invalid_chunk_index',
        message: `Chunk index must be a non-negative integer, got ${props.chunkIndex}`,
        details: { fields: ['chunkIndex'] },
      });
    }
  }
}
