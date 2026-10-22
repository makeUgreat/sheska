import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const loggerEnvSchema = z.object({
  /** 남길 가장 낮은 로그 level이다. 기본값은 `info`다. */
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  /**
   * stdout에 쓰는 로그 형식이다. `json`은 한 줄 JSON, `pretty`는 사람이 읽기 좋은 형식이다. 기본값은 `json`이다.
   * `pretty`는 devDependency인 pino-pretty가 필요해서 local에서만 쓴다.
   */
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
});

export const loggerConfig = registerAs('logger', () => {
  const result = loggerEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(
      `Invalid logger configuration.\n${z.prettifyError(result.error)}`,
    );
  }
  return { level: result.data.LOG_LEVEL, format: result.data.LOG_FORMAT };
});
