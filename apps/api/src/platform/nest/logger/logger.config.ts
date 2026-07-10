import { z } from 'zod';

const LOG_LEVELS = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
] as const;

const loggerConfigSchema = z
  .object({
    LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  })
  .transform((env) => ({
    level: env.LOG_LEVEL,
  }));

export type LoggerConfig = z.infer<typeof loggerConfigSchema>;

export function parseLoggerConfig(env: Record<string, unknown>): LoggerConfig {
  return loggerConfigSchema.parse(env);
}
