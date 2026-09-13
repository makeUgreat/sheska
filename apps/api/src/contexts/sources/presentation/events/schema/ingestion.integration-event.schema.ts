import { z } from 'zod';

export const INGESTION_STARTED_EVENT_TYPE = 'source.ingestion.started';
export const INGESTION_PROGRESS_EVENT_TYPE = 'source.ingestion.progress';
export const INGESTION_COMPLETED_EVENT_TYPE = 'source.ingestion.completed';
export const INGESTION_FAILED_EVENT_TYPE = 'source.ingestion.failed';

const INGESTION_EVENT_VERSION = 1;

const integrationEventMetadataSchema = {
  eventId: z.uuidv7(),
  eventVersion: z.literal(INGESTION_EVENT_VERSION),
  occurredAt: z.date(),
};

export const ingestionStartedIntegrationEventSchema = z.strictObject({
  ...integrationEventMetadataSchema,
  eventType: z.literal(INGESTION_STARTED_EVENT_TYPE),
  payload: z.strictObject({
    syncJobId: z.string().min(1),
    totalChunks: z.number().int().nonnegative(),
  }),
});

export const ingestionProgressIntegrationEventSchema = z.strictObject({
  ...integrationEventMetadataSchema,
  eventType: z.literal(INGESTION_PROGRESS_EVENT_TYPE),
  payload: z.strictObject({
    syncJobId: z.string().min(1),
    processedChunks: z.number().int().nonnegative(),
    totalChunks: z.number().int().nonnegative(),
  }),
});

export const ingestionCompletedIntegrationEventSchema = z.strictObject({
  ...integrationEventMetadataSchema,
  eventType: z.literal(INGESTION_COMPLETED_EVENT_TYPE),
  payload: z.strictObject({ syncJobId: z.string().min(1) }),
});

export const ingestionFailedIntegrationEventSchema = z.strictObject({
  ...integrationEventMetadataSchema,
  eventType: z.literal(INGESTION_FAILED_EVENT_TYPE),
  payload: z.strictObject({ syncJobId: z.string().min(1) }),
});
