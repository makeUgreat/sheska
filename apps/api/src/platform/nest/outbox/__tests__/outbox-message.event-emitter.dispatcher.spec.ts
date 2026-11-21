import { EventEmitter2 } from '@nestjs/event-emitter';
import { describe, expect, it, vi } from 'vitest';
import { type OutboxMessage } from '@kernels/application';
import { OutboxMessageEventEmitterDispatcher } from '../outbox-message.event-emitter.dispatcher';

describe('OutboxMessageEventEmitterDispatcher', () => {
  it('event type으로 메시지 전체를 전달한다', async () => {
    const message = buildMessage();
    const emitAsync = vi.fn().mockResolvedValue([undefined]);
    const dispatcher = new OutboxMessageEventEmitterDispatcher(asEventEmitter({ emitAsync }));

    await dispatcher.dispatch(message);

    expect(emitAsync).toHaveBeenCalledWith(message.eventType, message);
  });

  it('등록된 listener가 없으면 실패한다', async () => {
    const message = buildMessage();
    const dispatcher = new OutboxMessageEventEmitterDispatcher(asEventEmitter({ emitAsync: vi.fn().mockResolvedValue([]) }));

    await expect(dispatcher.dispatch(message)).rejects.toThrow('No listener registered for source.sync_job.created');
  });
});

function buildMessage(): OutboxMessage {
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
