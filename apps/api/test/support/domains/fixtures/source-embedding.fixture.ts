import { SourceEmbedding } from '@contexts/ingestion/domain';

const VALID_EMBEDDING = Array.from({ length: 1024 }, (_, i) => i * 0.001);

interface BuildSourceEmbeddingParams {
  sourceId?: string;
  model?: string;
  chunks?: Array<{
    chunkIndex?: number;
    chunkContent?: string;
    embedding?: number[];
  }>;
}

export function buildSourceEmbedding(
  params: BuildSourceEmbeddingParams = {},
): SourceEmbedding {
  const chunks = params.chunks ?? [
    {
      chunkIndex: 0,
      chunkContent: 'default chunk content',
      embedding: VALID_EMBEDDING,
    },
  ];
  return SourceEmbedding.create({
    sourceId: params.sourceId ?? 'source-1',
    model: params.model ?? 'qwen3-embedding:0.6b',
    chunks: chunks.map((c, i) => ({
      chunkIndex: c.chunkIndex ?? i,
      chunkContent: c.chunkContent ?? 'default chunk content',
      embedding: c.embedding ?? VALID_EMBEDDING,
    })),
  });
}

export { VALID_EMBEDDING };
