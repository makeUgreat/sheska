import { type SourceSyncJobRow } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/schema';

const persistedAt = new Date('2026-01-01T00:00:00.000Z');

export function buildSourceSyncJobRow(
  params: Partial<SourceSyncJobRow> = {},
): SourceSyncJobRow {
  return {
    id: params.id ?? 'source-sync-job-1',
    sourceId: params.sourceId ?? 'source-1',
    fingerprint: params.fingerprint ?? 'fingerprint-1',
    status: params.status ?? 'pending',
    createdAt: params.createdAt ?? persistedAt,
  };
}
