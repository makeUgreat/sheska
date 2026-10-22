import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const otelEnvSchema = z
  .object({
    /** 텔레메트리를 보낼 OTLP/HTTP 주소다. 없으면 보내지 않는다. 예: `http://alloy.observability:4318` */
    OTEL_EXPORTER_OTLP_ENDPOINT: z.url({ protocol: /^https?$/ }).optional(),
    /**
     * 텔레메트리에 붙일 속성이다. 쉼표로 나눈 `key=value` 목록이다.
     * 주소가 있으면 `deployment.environment.name`이 있어야 한다. 예: `deployment.environment.name=production`
     */
    OTEL_RESOURCE_ATTRIBUTES: z.string().optional(),
  })
  .refine(
    (env) =>
      !env.OTEL_EXPORTER_OTLP_ENDPOINT ||
      /(^|,)\s*deployment\.environment\.name=\S/.test(
        env.OTEL_RESOURCE_ATTRIBUTES ?? '',
      ),
    {
      message:
        'deployment.environment.name is required when OTEL_EXPORTER_OTLP_ENDPOINT is set.',
      path: ['OTEL_RESOURCE_ATTRIBUTES'],
    },
  );

export const otelConfig = registerAs('otel', () => {
  const result = otelEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(
      `Invalid telemetry configuration.\n${z.prettifyError(result.error)}`,
    );
  }
  return { otlpEndpoint: result.data.OTEL_EXPORTER_OTLP_ENDPOINT };
});
