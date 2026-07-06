import { type SourceVectorRow } from '@contexts/ingestion/infrastructure/persistence/postgres-drizzle/schema';
import { VALID_EMBEDDING } from '../../../../contexts/ingestion/fixtures/source-vector.fixture';

const persistedAt = new Date('2026-01-01T00:00:00.000Z');

export function buildSourceVectorRow(
  params: Partial<SourceVectorRow> = {},
): SourceVectorRow {
  return {
    sourceId: params.sourceId ?? 'source-1',
    embedding: params.embedding ?? VALID_EMBEDDING,
    model: params.model ?? 'nomic-embed-text',
    createdAt: params.createdAt ?? persistedAt,
    updatedAt: params.updatedAt ?? persistedAt,
  };
}
