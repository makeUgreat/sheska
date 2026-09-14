import { Post } from '@contexts/posts/domain';

export function buildPost(
  params: { sourceId?: string; title?: string } = {},
): Post {
  return Post.create({
    sourceId: params.sourceId ?? 'source-1',
  });
}
