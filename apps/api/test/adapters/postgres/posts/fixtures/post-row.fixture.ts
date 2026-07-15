import { type PostRow } from '@contexts/posts/infrastructure/persistence/postgres-drizzle/schema';

const persistedAt = new Date('2026-01-01T00:00:00.000Z');

export function buildPostRow(params: Partial<PostRow> = {}): PostRow {
  return {
    id: params.id ?? 'post-1',
    sourceId: params.sourceId ?? 'source-1',
    title: params.title ?? '테스트 포스트',
    viewCount: params.viewCount ?? 0,
    createdAt: params.createdAt ?? persistedAt,
    updatedAt: params.updatedAt ?? persistedAt,
  };
}
