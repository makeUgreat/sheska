import { type SourceVectorRow } from '@contexts/ingestion/infrastructure/persistence/postgres-drizzle/schema';
import { VALID_EMBEDDING } from '../../../../support/domains/fixtures/source-vector.fixture';

const persistedAt = new Date('2026-01-01T00:00:00.000Z');

export function buildSourceVectorRow(
  params: Partial<SourceVectorRow> = {},
): SourceVectorRow {
  return {
    sourceId: params.sourceId ?? 'source-1',
    chunkIndex: params.chunkIndex ?? 0,
    chunkContent: params.chunkContent ?? 'default chunk content',
    embedding: params.embedding ?? VALID_EMBEDDING,
    model: params.model ?? 'qwen3-embedding:0.6b',
    createdAt: params.createdAt ?? persistedAt,
    updatedAt: params.updatedAt ?? persistedAt,
  };
}
