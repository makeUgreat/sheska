import { z } from 'zod';

const libraryConfigSchema = z
  .object({
    LIBRARY_KNOWLEDGE_FOLDER: z.string().trim().min(1),
  })
  .transform((env) => ({
    knowledgeFolder: env.LIBRARY_KNOWLEDGE_FOLDER,
  }));

export type LibraryConfig = z.infer<typeof libraryConfigSchema>;

export function parseLibraryConfig(
  env: Record<string, unknown>,
): LibraryConfig {
  return libraryConfigSchema.parse(env);
}
