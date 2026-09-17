import { z } from 'zod';

const INGESTION_EVENT_VERSION = 1;

const integrationEventMetadataSchema = {
  eventId: z.uuidv7(),
  eventVersion: z.literal(INGESTION_EVENT_VERSION),
  occurredAt: z.date(),
};

export const ingestionCompletedIntegrationEventSchema = z.strictObject({
  ...integrationEventMetadataSchema,
  eventType: z.literal('source.ingestion.completed'),
  payload: z.strictObject({
    syncJobId: z.string().min(1),
    totalChunks: z.number().int().positive(),
  }),
});

export const ingestionFailedIntegrationEventSchema = z.strictObject({
  ...integrationEventMetadataSchema,
  eventType: z.literal('source.ingestion.failed'),
  payload: z.strictObject({ syncJobId: z.string().min(1) }),
});
