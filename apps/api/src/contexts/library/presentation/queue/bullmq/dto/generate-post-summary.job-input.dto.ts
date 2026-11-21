import { z } from 'zod';

export const generatePostSummaryJobInputSchema = z.strictObject({
  postId: z.string().min(1),
});

export type GeneratePostSummaryJobInput = z.infer<typeof generatePostSummaryJobInputSchema>;
