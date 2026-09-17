import { describe, expect, it, vi } from 'vitest';
import { type InitiateSourceEmbeddingUseCase } from '@contexts/ingestion/application/use-cases/initiate-source-embedding.use-case';
import { SourceSyncJobCreatedIntegrationEventConsumer } from '../source-sync-job-created.integration-event.consumer';

describe('SourceSyncJobCreatedIntegrationEventConsumer', () => {
  it('계약을 검증하고 workflow command로 변환한다', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const consumer = new SourceSyncJobCreatedIntegrationEventConsumer({
      execute,
    } as unknown as InitiateSourceEmbeddingUseCase);
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

    expect(execute).toHaveBeenCalledWith({
      ...message.payload,
    });
  });

  it('지원하지 않는 version은 거부한다', async () => {
    const useCase = {
      execute: vi.fn(),
    } as unknown as InitiateSourceEmbeddingUseCase;
    const consumer = new SourceSyncJobCreatedIntegrationEventConsumer(useCase);

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
