import { describe, expect, it, vi } from 'vitest';
import {
  type IntegrationEvent,
  type IntegrationEventDispatcher,
  type LoggerPort,
  type OutboxRelayStore,
} from '@kernels/application';
import { OutboxRelay } from '../outbox.relay';

describe('OutboxRelay', () => {
  it('pending event를 전달한 뒤 published로 표시한다', async () => {
    const event = buildIntegrationEvent();
    const store = createStore([event]);
    const dispatcher = createDispatcher();
    const relay = new OutboxRelay(store, dispatcher, createLogger(), {
      batchSize: 100,
    });

    await relay.relayPending();

    expect(store.findPending).toHaveBeenCalledWith(100);
    expect(dispatcher.dispatch).toHaveBeenCalledWith(event);
    expect(store.markPublished).toHaveBeenCalledWith(event.eventId);
  });

  it('전달에 실패한 event는 published로 표시하지 않고 다음 event를 계속 처리한다', async () => {
    const failedEvent = buildIntegrationEvent({ eventId: 'event-1' });
    const deliveredEvent = buildIntegrationEvent({ eventId: 'event-2' });
    const store = createStore([failedEvent, deliveredEvent]);
    const failure = new Error('Dispatcher unavailable');
    const dispatcher = createDispatcher();
    dispatcher.dispatch
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(undefined);
    const logger = createLogger();
    const relay = new OutboxRelay(store, dispatcher, logger, {
      batchSize: 100,
    });

    await relay.relayPending();

    expect(store.markPublished).toHaveBeenCalledOnce();
    expect(store.markPublished).toHaveBeenCalledWith(deliveredEvent.eventId);
    expect(logger.error).toHaveBeenCalledWith(
      'Integration event relay failed',
      failure,
      {
        eventId: failedEvent.eventId,
        eventType: failedEvent.eventType,
      },
    );
  });

  it('pending 조회 실패를 전파하고 다음 polling에서 다시 시도할 수 있다', async () => {
    const event = buildIntegrationEvent();
    const store = createStore([]);
    const failure = new Error('Database unavailable');
    store.findPending
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce([event]);
    const dispatcher = createDispatcher();
    const relay = new OutboxRelay(store, dispatcher, createLogger(), {
      batchSize: 100,
    });

    await expect(relay.relayPending()).rejects.toBe(failure);
    await relay.relayPending();

    expect(dispatcher.dispatch).toHaveBeenCalledWith(event);
  });
});

function buildIntegrationEvent(
  overrides: Partial<IntegrationEvent> = {},
): IntegrationEvent {
  return {
    eventId: 'event-1',
    eventType: 'source.sync_job.created',
    eventVersion: 1,
    occurredAt: new Date('2026-09-10T00:00:00.000Z'),
    payload: { sourceId: 'source-1' },
    ...overrides,
  };
}

function createStore(events: IntegrationEvent[]) {
  return {
    findPending: vi
      .fn<OutboxRelayStore['findPending']>()
      .mockResolvedValue(events),
    markPublished: vi.fn<OutboxRelayStore['markPublished']>(),
  };
}

function createDispatcher() {
  return {
    dispatch: vi.fn<IntegrationEventDispatcher['dispatch']>(),
  };
}

function createLogger() {
  return {
    log: vi.fn<LoggerPort['log']>(),
    error: vi.fn<LoggerPort['error']>(),
    warn: vi.fn<LoggerPort['warn']>(),
    debug: vi.fn<LoggerPort['debug']>(),
  };
}
