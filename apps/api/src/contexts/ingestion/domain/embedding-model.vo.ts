import {
  DomainException,
  DOMAIN_ERROR_KIND,
  ValueObject,
  type DomainPrimitive,
} from '@kernels/domain';

const EMBEDDING_MODEL_SPECS: Record<string, { dimensions: number }> = {
  'qwen3-embedding:0.6b': { dimensions: 1024 },
};

export class EmbeddingModel extends ValueObject<string> {
  static of(value: string): EmbeddingModel {
    return new EmbeddingModel({ value });
  }

  get expectedDimensions(): number {
    return EMBEDDING_MODEL_SPECS[this.props.value].dimensions;
  }

  protected validate(props: DomainPrimitive<string>): void {
    if (!(props.value in EMBEDDING_MODEL_SPECS)) {
      throw new DomainException({
        kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
        code: 'ingestion.embedding_model.unsupported',
        message: `Unsupported embedding model: ${props.value}`,
        details: { fields: ['model'] },
      });
    }
  }
}
