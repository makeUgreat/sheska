import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { otelConfig } from '../otel.config';

const otlpEndpoint = 'http://127.0.0.1:4318';

describe('otelConfig', () => {
  beforeEach(() => {
    vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', undefined);
    vi.stubEnv('OTEL_RESOURCE_ATTRIBUTES', undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('OTEL_EXPORTER_OTLP_ENDPOINT가 없으면 주소 없이 돌려준다', () => {
    expect(otelConfig()).toEqual({ otlpEndpoint: undefined });
  });

  it('주소와 deployment.environment.name이 있으면 주소를 돌려준다', () => {
    vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', otlpEndpoint);
    vi.stubEnv(
      'OTEL_RESOURCE_ATTRIBUTES',
      'service.version=1.0.0,deployment.environment.name=production',
    );

    expect(otelConfig()).toEqual({ otlpEndpoint });
  });

  it.each(['not-a-url', 'grpc://127.0.0.1:4317'])(
    'OTEL_EXPORTER_OTLP_ENDPOINT가 %j이면 거부한다',
    (value) => {
      vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', value);
      vi.stubEnv(
        'OTEL_RESOURCE_ATTRIBUTES',
        'deployment.environment.name=production',
      );

      expect(() => otelConfig()).toThrow('OTEL_EXPORTER_OTLP_ENDPOINT');
    },
  );

  it.each([undefined, 'service.version=1.0.0', 'deployment.environment.name='])(
    '주소가 있는데 OTEL_RESOURCE_ATTRIBUTES가 %j이면 거부한다',
    (value) => {
      vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', otlpEndpoint);
      vi.stubEnv('OTEL_RESOURCE_ATTRIBUTES', value);

      expect(() => otelConfig()).toThrow('deployment.environment.name');
    },
  );
});
