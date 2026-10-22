import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const httpEnvSchema = z.object({
  /** HTTP 요청을 받을 포트다. 기본값은 3000이다. */
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /**
   * 요청을 허용할 브라우저 출처를 쉼표로 구분해 적는다.
   * 예: `app://obsidian.md,https://hash.meogle.co.kr`
   */
  CORS_ORIGINS: z
    .string()
    .transform((value) => value.split(',').map((origin) => origin.trim()))
    .pipe(z.array(z.url()).min(1)),
});

export const httpConfig = registerAs('http', () => {
  const result = httpEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(
      `Invalid HTTP configuration.\n${z.prettifyError(result.error)}`,
    );
  }
  return {
    port: result.data.PORT,
    corsOrigins: result.data.CORS_ORIGINS,
  };
});
