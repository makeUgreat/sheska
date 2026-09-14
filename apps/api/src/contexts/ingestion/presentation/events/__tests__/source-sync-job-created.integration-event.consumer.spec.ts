import { describe, expect, it, vi } from 'vitest';
import { type EmbedRequestDispatcher } from '@contexts/ingestion/application/ports';
import { SourceSyncJobCreatedIntegrationEventConsumer } from '../source-sync-job-created.integration-event.consumer';

describe('SourceSyncJobCreatedIntegrationEventConsumer', () => {
  it('계약을 검증하고 event id를 멱등성 키로 전달한다', async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const dispatcher: EmbedRequestDispatcher = { enqueue };
    const consumer = new SourceSyncJobCreatedIntegrationEventConsumer(
      dispatcher,
    );
    const message = {
      eventId: '01994ae9-3f45-7d86-845d-31f84d49cdb9',
      eventType: 'source.sync_job.created',
      eventVersion: 1,
      occurredAt: new Date('2026-09-10T00:00:00.000Z'),
      payload: {
        sourceId: 'source-1',
        syncJobId: 'sync-job-1',
        content: '# Source note',
      },
    };

    await consumer.handle(message);

    expect(enqueue).toHaveBeenCalledWith(message.payload, {
      idempotencyKey: message.eventId,
    });
  });

  it('지원하지 않는 version은 거부한다', async () => {
    const dispatcher: EmbedRequestDispatcher = { enqueue: vi.fn() };
    const consumer = new SourceSyncJobCreatedIntegrationEventConsumer(
      dispatcher,
    );

    await expect(
      consumer.handle({
        eventId: '01994ae9-3f45-7d86-845d-31f84d49cdb9',
        eventType: 'source.sync_job.created',
        eventVersion: 2,
        occurredAt: new Date(),
        payload: {
          sourceId: 'source-1',
          syncJobId: 'sync-job-1',
          content: '# Source note',
        },
      }),
    ).rejects.toThrow();
  });
});
