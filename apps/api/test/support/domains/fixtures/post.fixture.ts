import { Post } from '@contexts/library/domain';

export function buildPost(
  params: { sourceId?: string; title?: string } = {},
): Post {
  return Post.create({
    sourceId: params.sourceId ?? 'source-1',
  });
}
