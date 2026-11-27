import { describe, expect, it, vi } from 'vitest';
import { type PostQueryResult } from '@contexts/library/application/ports';
import { SourceFingerprint } from '@contexts/library/domain';
import { RequestPostSummaryUseCase } from '../request-post-summary.use-case';

describe('RequestPostSummaryUseCase', () => {
  it('post가 있으면 지금 본문의 fingerprint로 요약 job을 넣는다', async () => {
    const { useCase, dispatcher } = setup(postResult('# Outbox\n본문'));

    await useCase.execute({ postId: 'post-1' });

    expect(dispatcher.dispatch).toHaveBeenCalledWith({
      postId: 'post-1',
      fingerprint: SourceFingerprint.ofBody('# Outbox\n본문').unpack(),
    });
  });

  // nocap: library-summary-1
  it('post가 없으면 요약 job을 넣지 않는다', async () => {
    const { useCase, dispatcher } = setup(null);

    await useCase.execute({ postId: 'post-1' });

    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('job을 넣지 못하면 exception을 전파한다', async () => {
    const failure = new Error('Queue unavailable');
    const { useCase, dispatcher } = setup(postResult('본문'));
    dispatcher.dispatch.mockRejectedValue(failure);

    await expect(useCase.execute({ postId: 'post-1' })).rejects.toBe(failure);
  });
});

function setup(post: PostQueryResult | null) {
  const posts = { find: vi.fn().mockResolvedValue(post) };
  const dispatcher = { dispatch: vi.fn().mockResolvedValue(undefined) };
  const useCase = new RequestPostSummaryUseCase(posts as never, dispatcher);

  return { useCase, dispatcher };
}

function postResult(body: string): PostQueryResult {
  return {
    postId: 'post-1',
    sourceId: 'post-1',
    title: 'Outbox',
    body,
    viewCount: 0,
    summary: { kind: 'pending' },
    series: null,
    createdAt: new Date('2026-11-21T00:00:00Z'),
    updatedAt: new Date('2026-11-21T00:00:00Z'),
  };
}
