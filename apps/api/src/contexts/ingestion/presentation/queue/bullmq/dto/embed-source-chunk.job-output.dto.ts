import { z } from 'zod';

export const embedSourceChunkJobOutputSchema = z.strictObject({
  kind: z.literal('chunk'),
  chunkIndex: z.number().int().nonnegative(),
  chunkContent: z.string(),
  model: z.string().min(1),
  embedding: z.array(z.number()),
});

export type EmbedSourceChunkJobOutput = z.infer<
  typeof embedSourceChunkJobOutputSchema
>;
