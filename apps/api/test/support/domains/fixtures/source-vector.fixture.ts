import { SourceVector } from '@contexts/ingestion/domain';

const VALID_EMBEDDING = Array.from({ length: 1024 }, (_, i) => i * 0.001);

export function buildSourceVector(
  params: Partial<Parameters<typeof SourceVector.create>[0]> = {},
): SourceVector {
  return SourceVector.create({
    sourceId: params.sourceId ?? 'source-1',
    embedding: params.embedding ?? VALID_EMBEDDING,
    model: params.model ?? 'qwen3-embedding:0.6b',
  });
}

export { VALID_EMBEDDING };
