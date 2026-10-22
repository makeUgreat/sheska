import { type ConfigType, registerAs } from '@nestjs/config';
import { z } from 'zod';

const ollamaEnvSchema = z.object({
  /** 임베딩을 만드는 Ollama 서버 주소다. 예: `http://sheska-embedder:11434` */
  EMBEDDING_BASE_URL: z.url(),
});

export const ollamaConfig = registerAs('ollama', () => {
  const result = ollamaEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(
      `Invalid embedding server configuration.\n${z.prettifyError(result.error)}`,
    );
  }
  return { baseUrl: result.data.EMBEDDING_BASE_URL };
});

export type OllamaConfig = ConfigType<typeof ollamaConfig>;
