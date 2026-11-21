import { z } from 'zod';

const outboxMessageMetadataSchema = {
  eventId: z.uuidv7(),
  eventVersion: z.literal(1),
  occurredAt: z.date(),
};

export const postPublishedOutboxMessageSchema = z.strictObject({
  ...outboxMessageMetadataSchema,
  eventType: z.literal('post.published'),
  payload: z.strictObject({ postId: z.string().min(1) }),
});

export const sourceBodyChangedOutboxMessageSchema = z.strictObject({
  ...outboxMessageMetadataSchema,
  eventType: z.literal('source.body_changed'),
  payload: z.strictObject({ sourceId: z.string().min(1) }),
});
