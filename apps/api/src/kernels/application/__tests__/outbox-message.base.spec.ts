import { describe, expect, it } from 'vitest';
import { OutboxMessage, type OutboxMessageParams } from '../outbox-message.base';

const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

interface SourceCreatedEventParams extends OutboxMessageParams {
  readonly sourceId: string;
}

interface SourceDeletedEventParams extends OutboxMessageParams {
  readonly reason: string;
}

class SourceCreatedEvent extends OutboxMessage {
  readonly eventType = 'source.created';
  readonly eventVersion = 1;
  readonly payload: { readonly sourceId: string };

  constructor(params: SourceCreatedEventParams) {
    super(params);
    this.payload = { sourceId: params.sourceId };
  }
}

class SourceDeletedEvent extends OutboxMessage {
  readonly eventType = 'source.deleted';
  readonly eventVersion = 1;
  readonly payload: { readonly reason: string };

  constructor(params: SourceDeletedEventParams) {
    super(params);
    this.payload = { reason: params.reason };
  }
}

describe('OutboxMessage', () => {
  it('event metadata와 payload로 메시지를 생성한다', () => {
    const occurredAt = new Date('2026-09-10T00:00:00.000Z');

    const event = new SourceCreatedEvent({
      sourceId: 'source-1',
      occurredAt,
    });

    expect(event).toMatchObject({
      eventType: 'source.created',
      eventVersion: 1,
      occurredAt,
      payload: { sourceId: 'source-1' },
    });
    expect(event.eventId).toMatch(UUID_V7_PATTERN);
    expect(event.occurredAt).not.toBe(occurredAt);
  });

  it('eventType을 기준으로 event union을 좁힌다', () => {
    const createdEvent = new SourceCreatedEvent({
      sourceId: 'source-1',
    });
    const deletedEvent = new SourceDeletedEvent({
      reason: 'requested',
    });

    const readPayload = (event: SourceCreatedEvent | SourceDeletedEvent): string => {
      switch (event.eventType) {
        case 'source.created':
          return event.payload.sourceId;
        case 'source.deleted':
          return event.payload.reason;
      }
    };

    expect(readPayload(createdEvent)).toBe('source-1');
    expect(readPayload(deletedEvent)).toBe('requested');
    expect(createdEvent.eventId).not.toBe(deletedEvent.eventId);
  });
});
