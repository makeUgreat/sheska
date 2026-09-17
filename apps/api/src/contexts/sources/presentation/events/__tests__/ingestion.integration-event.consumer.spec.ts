import { describe, expect, it, vi } from 'vitest';
import { type ApplyIngestionUpdateUseCase } from '@contexts/sources/application/use-cases/apply-ingestion-update.use-case';
import { IngestionIntegrationEventConsumer } from '../ingestion.integration-event.consumer';

describe('IngestionIntegrationEventConsumer', () => {
  it.each([
    {
      method: 'onCompleted' as const,
      eventType: 'source.ingestion.completed',
      payload: { syncJobId: 'sync-job-1', totalChunks: 5 },
      command: { kind: 'completed', syncJobId: 'sync-job-1', totalChunks: 5 },
    },
    {
      method: 'onFailed' as const,
      eventType: 'source.ingestion.failed',
      payload: { syncJobId: 'sync-job-1' },
      command: { kind: 'failed', syncJobId: 'sync-job-1' },
    },
  ])(
    '$eventType 계약을 검증하고 application command로 변환한다',
    async ({ method, eventType, payload, command }) => {
      const execute = vi.fn().mockResolvedValue(undefined);
      const consumer = createConsumer(execute);

      await consumer[method](buildIntegrationEvent(eventType, payload));

      expect(execute).toHaveBeenCalledWith(command);
    },
  );

  it('지원하지 않는 event version을 거부한다', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const consumer = createConsumer(execute);

    await expect(
      consumer.onCompleted({
        ...buildIntegrationEvent('source.ingestion.completed', {
          syncJobId: 'sync-job-1',
          totalChunks: 5,
        }),
        eventVersion: 2,
      }),
    ).rejects.toThrow();

    expect(execute).not.toHaveBeenCalled();
  });
});

function createConsumer(execute: ReturnType<typeof vi.fn>) {
  return new IngestionIntegrationEventConsumer({
    execute,
  } as unknown as ApplyIngestionUpdateUseCase);
}

function buildIntegrationEvent<TEventType extends string, TPayload>(
  eventType: TEventType,
  payload: TPayload,
) {
  return {
    eventId: '01994ae9-3f45-7d86-845d-31f84d49cdb9',
    eventType,
    eventVersion: 1,
    occurredAt: new Date('2026-09-10T00:00:00.000Z'),
    payload,
  };
}
