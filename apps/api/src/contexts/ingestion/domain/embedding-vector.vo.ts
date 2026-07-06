import {
  DomainException,
  DOMAIN_ERROR_KIND,
  ValueObject,
} from '@kernels/domain';
import { EmbeddingModel } from './embedding-model.vo';

interface EmbeddingVectorProps {
  values: number[];
  dimensions: number;
  expectedDimensions: number;
}

export class EmbeddingVector extends ValueObject<EmbeddingVectorProps> {
  static of(values: number[], model: EmbeddingModel): EmbeddingVector {
    return new EmbeddingVector({
      values,
      dimensions: values.length,
      expectedDimensions: model.expectedDimensions,
    });
  }

  protected validate(props: EmbeddingVectorProps): void {
    if (props.dimensions !== props.expectedDimensions) {
      throw new DomainException({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'ingestion.embedding_vector.invalid_dimensions',
        message: `Embedding vector must have ${props.expectedDimensions} dimensions, got ${props.dimensions}`,
        details: { fields: ['embedding'] },
      });
    }
  }
}
