import { type PostRow } from '@contexts/library/infrastructure/persistence/postgres-drizzle/schema';

const persistedAt = new Date('2026-01-01T00:00:00.000Z');

export function buildPostRow(params: Partial<PostRow> = {}): PostRow {
  return {
    id: params.id ?? 'source-1',
    viewCount: params.viewCount ?? 0,
    createdAt: params.createdAt ?? persistedAt,
    updatedAt: params.updatedAt ?? persistedAt,
  };
}
