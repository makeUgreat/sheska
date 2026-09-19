import { describe, expect, it, vi } from 'vitest';
import {
  OutboxDeadLetteredIntegrationEvent,
  type ClaimedOutboxMessage,
  type IntegrationEvent,
  type IntegrationEventDispatcher,
  type LoggerPort,
  type OutboxRelayStore,
} from '@kernels/application';
import { OutboxRelay, type OutboxRelayOptions } from '../outbox.relay';

const OPTIONS: OutboxRelayOptions = {
  batchSize: 100,
  maxAttempts: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 10_000,
  claimLeaseMs: 30_000,
};

describe('OutboxRelay', () => {
  it('claim한 event를 전달한 뒤 published로 표시한다', async () => {
    const event = buildIntegrationEvent();
    const store = createStore([{ event, attemptCount: 1 }]);
    const dispatcher = createDispatcher();
    const relay = new OutboxRelay(
      store,
      dispatcher,
      createLogger(),
      { random: () => 1 },
      OPTIONS,
    );

    await relay.relayPending();

    expect(store.claimDue).toHaveBeenCalledWith(100, 30_000);
    expect(dispatcher.dispatch).toHaveBeenCalledWith(event);
    expect(store.markPublished).toHaveBeenCalledWith(event.eventId);
  });

  it('시도 횟수가 남은 실패는 backoff 지연으로 재시도를 예약한다', async () => {
    const event = buildIntegrationEvent();
    const store = createStore([{ event, attemptCount: 2 }]);
    const failure = new Error('Dispatcher unavailable');
    const dispatcher = createDispatcher();
    dispatcher.dispatch.mockRejectedValueOnce(failure);
    const relay = new OutboxRelay(
      store,
      dispatcher,
      createLogger(),
      { random: () => 1 },
      OPTIONS,
    );

    await relay.relayPending();

    expect(store.scheduleRetry).toHaveBeenCalledWith(
      event.eventId,
      2_000,
      'Dispatcher unavailable',
    );
    expect(store.markPublished).not.toHaveBeenCalled();
    expect(store.markDeadLettered).not.toHaveBeenCalled();
  });

  it('재시도 예약 실패는 warn으로 기록한다', async () => {
    const event = buildIntegrationEvent();
    const store = createStore([{ event, attemptCount: 1 }]);
    const failure = new Error('Dispatcher unavailable');
    const dispatcher = createDispatcher();
    dispatcher.dispatch.mockRejectedValueOnce(failure);
    const logger = createLogger();
    const relay = new OutboxRelay(
      store,
      dispatcher,
      logger,
      { random: () => 1 },
      OPTIONS,
    );

    await relay.relayPending();

    expect(logger.warn).toHaveBeenCalledWith(
      'Integration event relay failed',
      failure,
      {
        eventId: event.eventId,
        eventType: event.eventType,
        attempt: 1,
        maxAttempts: 3,
        delayMs: 1_000,
        retryAllowed: true,
      },
    );
  });

  it('시도 횟수를 모두 쓴 실패는 dead letter로 격리하고 재시도를 예약하지 않는다', async () => {
    const event = buildIntegrationEvent();
    const store = createStore([{ event, attemptCount: 3 }]);
    const failure = new Error('Dispatcher unavailable');
    const dispatcher = createDispatcher();
    dispatcher.dispatch.mockRejectedValueOnce(failure);
    const logger = createLogger();
    const relay = new OutboxRelay(
      store,
      dispatcher,
      logger,
      { random: () => 1 },
      OPTIONS,
    );

    await relay.relayPending();

    expect(store.markDeadLettered).toHaveBeenCalledWith(
      event.eventId,
      'Dispatcher unavailable',
    );
    expect(store.scheduleRetry).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      'Integration event dead-lettered',
      failure,
      {
        eventId: event.eventId,
        eventType: event.eventType,
        attempt: 3,
        maxAttempts: 3,
        retryAllowed: false,
        retryBlockedReason: 'max_attempts_exhausted',
      },
    );
  });

  it('격리한 event를 dead lettered 통합 이벤트로 알린다', async () => {
    const event = buildIntegrationEvent();
    const store = createStore([{ event, attemptCount: 3 }]);
    const dispatcher = createDispatcher();
    dispatcher.dispatch.mockRejectedValueOnce(
      new Error('Dispatcher unavailable'),
    );
    const relay = new OutboxRelay(
      store,
      dispatcher,
      createLogger(),
      { random: () => 1 },
      OPTIONS,
    );

    await relay.relayPending();

    const notification = dispatcher.dispatch.mock
      .calls[1]?.[0] as OutboxDeadLetteredIntegrationEvent;
    expect(notification.eventType).toBe('outbox.message.dead_lettered');
    expect(notification.payload).toEqual({
      deadLetteredEventId: event.eventId,
      deadLetteredEventType: event.eventType,
      deadLetteredPayload: event.payload,
      attemptCount: 3,
    });
  });

  it('dead letter 알림 발행이 실패해도 예외를 밖으로 던지지 않는다', async () => {
    const event = buildIntegrationEvent();
    const store = createStore([{ event, attemptCount: 3 }]);
    const notificationFailure = new Error('No listener registered');
    const dispatcher = createDispatcher();
    dispatcher.dispatch
      .mockRejectedValueOnce(new Error('Dispatcher unavailable'))
      .mockRejectedValueOnce(notificationFailure);
    const logger = createLogger();
    const relay = new OutboxRelay(
      store,
      dispatcher,
      logger,
      { random: () => 1 },
      OPTIONS,
    );

    await expect(relay.relayPending()).resolves.toBeUndefined();

    expect(store.markDeadLettered).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith(
      'Dead-letter notification failed',
      notificationFailure,
      { eventId: event.eventId, eventType: event.eventType },
    );
  });

  it('실패한 event 뒤에 오는 event도 계속 처리한다', async () => {
    const failedEvent = buildIntegrationEvent({ eventId: 'event-1' });
    const deliveredEvent = buildIntegrationEvent({ eventId: 'event-2' });
    const store = createStore([
      { event: failedEvent, attemptCount: 1 },
      { event: deliveredEvent, attemptCount: 1 },
    ]);
    const dispatcher = createDispatcher();
    dispatcher.dispatch
      .mockRejectedValueOnce(new Error('Dispatcher unavailable'))
      .mockResolvedValueOnce(undefined);
    const relay = new OutboxRelay(
      store,
      dispatcher,
      createLogger(),
      { random: () => 1 },
      OPTIONS,
    );

    await relay.relayPending();

    expect(store.markPublished).toHaveBeenCalledOnce();
    expect(store.markPublished).toHaveBeenCalledWith(deliveredEvent.eventId);
  });

  it('claim 실패를 전파하고 다음 polling에서 다시 시도할 수 있다', async () => {
    const event = buildIntegrationEvent();
    const store = createStore([]);
    const failure = new Error('Database unavailable');
    store.claimDue
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce([{ event, attemptCount: 1 }]);
    const dispatcher = createDispatcher();
    const relay = new OutboxRelay(
      store,
      dispatcher,
      createLogger(),
      { random: () => 1 },
      OPTIONS,
    );

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

function createStore(claimed: ClaimedOutboxMessage[]) {
  return {
    claimDue: vi.fn<OutboxRelayStore['claimDue']>().mockResolvedValue(claimed),
    markPublished: vi.fn<OutboxRelayStore['markPublished']>(),
    scheduleRetry: vi.fn<OutboxRelayStore['scheduleRetry']>(),
    markDeadLettered: vi.fn<OutboxRelayStore['markDeadLettered']>(),
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
