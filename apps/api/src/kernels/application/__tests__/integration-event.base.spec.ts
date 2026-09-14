import { describe, expect, it } from 'vitest';
import {
  IntegrationEvent,
  type IntegrationEventParams,
} from '../integration-event.base';

const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

interface SourceCreatedIntegrationEventParams extends IntegrationEventParams {
  readonly sourceId: string;
}

interface SourceDeletedIntegrationEventParams extends IntegrationEventParams {
  readonly reason: string;
}

class SourceCreatedIntegrationEvent extends IntegrationEvent {
  readonly eventType = 'source.created';
  readonly eventVersion = 1;
  readonly payload: { readonly sourceId: string };

  constructor(params: SourceCreatedIntegrationEventParams) {
    super(params);
    this.payload = { sourceId: params.sourceId };
  }
}

class SourceDeletedIntegrationEvent extends IntegrationEvent {
  readonly eventType = 'source.deleted';
  readonly eventVersion = 1;
  readonly payload: { readonly reason: string };

  constructor(params: SourceDeletedIntegrationEventParams) {
    super(params);
    this.payload = { reason: params.reason };
  }
}

describe('IntegrationEvent', () => {
  it('event metadata와 payload로 event를 생성한다', () => {
    const occurredAt = new Date('2026-09-10T00:00:00.000Z');

    const event = new SourceCreatedIntegrationEvent({
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
    const createdEvent = new SourceCreatedIntegrationEvent({
      sourceId: 'source-1',
    });
    const deletedEvent = new SourceDeletedIntegrationEvent({
      reason: 'requested',
    });

    const readPayload = (
      event: SourceCreatedIntegrationEvent | SourceDeletedIntegrationEvent,
    ): string => {
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
