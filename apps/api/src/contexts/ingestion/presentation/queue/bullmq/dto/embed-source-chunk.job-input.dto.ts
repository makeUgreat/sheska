import { z } from 'zod';

export const embedSourceChunkJobInputSchema = z.strictObject({
  sourceId: z.string().min(1),
  syncJobId: z.string().min(1),
  chunkIndex: z.number().int().nonnegative(),
  chunkContent: z.string(),
});

export type EmbedSourceChunkJobInput = z.infer<
  typeof embedSourceChunkJobInputSchema
>;
