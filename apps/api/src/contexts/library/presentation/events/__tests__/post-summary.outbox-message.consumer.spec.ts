import { describe, expect, it, vi } from 'vitest';
import { type RequestPostSummaryUseCase } from '@contexts/library/application/use-cases/post-summary/request-post-summary.use-case';
import { PostSummaryOutboxMessageConsumer } from '../post-summary.outbox-message.consumer';

describe('PostSummaryOutboxMessageConsumer', () => {
  it.each([
    { method: 'onPostPublished' as const, eventType: 'post.published', payload: { postId: 'source-1' } },
    { method: 'onSourceBodyChanged' as const, eventType: 'source.body_changed', payload: { sourceId: 'source-1' } },
  ])('$eventType 계약을 검증하고 같은 식별자의 post에 요약을 요청한다', async ({ method, eventType, payload }) => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const consumer = createConsumer(execute);

    await consumer[method](buildOutboxMessage(eventType, payload));

    expect(execute).toHaveBeenCalledWith({ postId: 'source-1' });
  });

  it('지원하지 않는 message version을 거부한다', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const consumer = createConsumer(execute);

    await expect(
      consumer.onPostPublished({ ...buildOutboxMessage('post.published', { postId: 'source-1' }), eventVersion: 2 }),
    ).rejects.toThrow();

    expect(execute).not.toHaveBeenCalled();
  });
});

function createConsumer(execute: ReturnType<typeof vi.fn>) {
  return new PostSummaryOutboxMessageConsumer({
    execute,
  } as unknown as RequestPostSummaryUseCase);
}

function buildOutboxMessage<TEventType extends string, TPayload>(eventType: TEventType, payload: TPayload) {
  return {
    eventId: '01994ae9-3f45-7d86-845d-31f84d49cdb9',
    eventType,
    eventVersion: 1,
    occurredAt: new Date('2026-11-21T00:00:00.000Z'),
    payload,
  };
}
