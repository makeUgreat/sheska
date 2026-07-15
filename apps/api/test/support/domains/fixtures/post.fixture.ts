import { Post } from '@contexts/posts/domain';

export function buildPost(
  params: Partial<Parameters<typeof Post.create>[0]> = {},
): Post {
  return Post.create({
    sourceId: params.sourceId ?? 'source-1',
    title: params.title ?? '테스트 포스트',
  });
}
