import { z } from 'zod';

export const SOURCE_SYNC_JOB_CREATED_EVENT_TYPE = 'source.sync_job.created';

export const sourceSyncJobCreatedIntegrationEventSchema = z.strictObject({
  eventId: z.uuidv7(),
  eventType: z.literal(SOURCE_SYNC_JOB_CREATED_EVENT_TYPE),
  eventVersion: z.literal(1),
  occurredAt: z.date(),
  payload: z.strictObject({
    sourceId: z.string().min(1),
    syncJobId: z.string().min(1),
    content: z.string(),
  }),
});
