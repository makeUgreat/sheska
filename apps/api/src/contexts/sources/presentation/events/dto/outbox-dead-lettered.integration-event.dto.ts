import { z } from 'zod';

const OUTBOX_DEAD_LETTERED_EVENT_VERSION = 1;

export const outboxDeadLetteredIntegrationEventSchema = z.strictObject({
  eventId: z.uuidv7(),
  eventVersion: z.literal(OUTBOX_DEAD_LETTERED_EVENT_VERSION),
  occurredAt: z.date(),
  eventType: z.literal('outbox.message.dead_lettered'),
  payload: z.strictObject({
    deadLetteredEventId: z.string().min(1),
    deadLetteredEventType: z.string().min(1),
    deadLetteredPayload: z.unknown(),
    attemptCount: z.number().int().positive(),
  }),
});

export const deadLetteredSyncJobCreatedPayloadSchema = z.object({
  syncJobId: z.string().min(1),
});
