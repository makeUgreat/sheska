import { z } from 'zod';

export const sourceSyncJobCreatedIntegrationEventSchema = z.strictObject({
  eventId: z.uuidv7(),
  eventType: z.literal('source.sync_job.created'),
  eventVersion: z.literal(1),
  occurredAt: z.date(),
  payload: z.strictObject({
    sourceId: z.string().min(1),
    syncJobId: z.string().min(1),
    content: z.string(),
  }),
});
