import { v7 as newId } from 'uuid';

export interface OutboxEvent<
  TEventType extends string = string,
  TEventVersion extends number = number,
  TPayload = unknown,
> {
  readonly eventId: string;
  readonly eventType: TEventType;
  readonly eventVersion: TEventVersion;
  readonly occurredAt: Date;
  readonly payload: TPayload;
}

export interface OutboxEventParams<
  TEventType extends string,
  TEventVersion extends number,
  TPayload,
> {
  readonly eventType: TEventType;
  readonly eventVersion: TEventVersion;
  readonly occurredAt: Date;
  readonly payload: TPayload;
}

export function createOutboxEvent<
  const TEventType extends string,
  const TEventVersion extends number,
  TPayload,
>(
  params: OutboxEventParams<TEventType, TEventVersion, TPayload>,
): OutboxEvent<TEventType, TEventVersion, TPayload> {
  return {
    eventId: newId(),
    eventType: params.eventType,
    eventVersion: params.eventVersion,
    occurredAt: new Date(params.occurredAt),
    payload: params.payload,
  };
}
