import { z } from 'zod';

export const finalizeEmbeddingWorkflowJobInputSchema = z.strictObject({
  sourceId: z.string().min(1),
  syncJobId: z.string().min(1),
  totalChunks: z.number().int().nonnegative(),
});

export type FinalizeEmbeddingWorkflowJobInput = z.infer<
  typeof finalizeEmbeddingWorkflowJobInputSchema
>;
