import { z } from 'zod';

const otelConfigSchema = z
  .object({
    OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
  })
  .transform((env) => ({
    otlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }));

export type OtelConfig = z.infer<typeof otelConfigSchema>;

export function parseOtelConfig(env: Record<string, unknown>): OtelConfig {
  return otelConfigSchema.parse(env);
}
