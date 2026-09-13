import { EventEmitter2 } from '@nestjs/event-emitter';
import { describe, expect, it, vi } from 'vitest';
import { type IntegrationEvent } from '@kernels/application';
import { IntegrationEventEmitterDispatcher } from '../integration.event-emitter.dispatcher';

describe('IntegrationEventEmitterDispatcher', () => {
  it('event type으로 전체 integration event를 전달한다', async () => {
    const event = buildIntegrationEvent();
    const emitAsync = vi.fn().mockResolvedValue([undefined]);
    const dispatcher = new IntegrationEventEmitterDispatcher(
      asEventEmitter({ emitAsync }),
    );

    await dispatcher.dispatch(event);

    expect(emitAsync).toHaveBeenCalledWith(event.eventType, event);
  });

  it('등록된 listener가 없으면 실패한다', async () => {
    const event = buildIntegrationEvent();
    const dispatcher = new IntegrationEventEmitterDispatcher(
      asEventEmitter({ emitAsync: vi.fn().mockResolvedValue([]) }),
    );

    await expect(dispatcher.dispatch(event)).rejects.toThrow(
      'No listener registered for source.sync_job.created',
    );
  });
});

function buildIntegrationEvent(): IntegrationEvent {
  return {
    eventId: 'event-1',
    eventType: 'source.sync_job.created',
    eventVersion: 1,
    occurredAt: new Date('2026-09-10T00:00:00.000Z'),
    payload: { sourceId: 'source-1' },
  };
}

function asEventEmitter(value: { emitAsync: ReturnType<typeof vi.fn> }) {
  return value as unknown as EventEmitter2;
}
