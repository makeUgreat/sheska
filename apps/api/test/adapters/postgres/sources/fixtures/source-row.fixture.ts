import { type SourceRow } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/schema';
import { sourceContentByteSize } from '../../../../support/domains/fixtures/source.fixture';

const persistedAt = new Date('2026-01-01T00:00:00.000Z');

export function buildSourceRow(params: Partial<SourceRow> = {}): SourceRow {
  const content = params.content ?? '# Source note';

  return {
    id: params.id ?? 'source-1',
    externalSourceId: params.externalSourceId ?? 'Notes/source.md',
    content,
    fingerprint: params.fingerprint ?? 'fingerprint-1',
    sizeBytes: params.sizeBytes ?? sourceContentByteSize(content),
    createdAt: params.createdAt ?? persistedAt,
    updatedAt: params.updatedAt ?? persistedAt,
  };
}
