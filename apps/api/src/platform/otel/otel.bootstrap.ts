import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { config as loadDotenv } from 'dotenv';
import { parseOtelConfig } from './otel.config';

// Fixed identity of this codebase, not a per-deployment setting — unlike
// OTEL_EXPORTER_OTLP_ENDPOINT (differs dev vs. prod), this never changes.
const SERVICE_NAME = 'sheska-api';
const INSTRUMENTED_ENVIRONMENTS = ['production', 'development'];

// This module is imported before Nest's ConfigModule (which normally owns
// `.env.${NODE_ENV}` loading) has a chance to run, so it loads its own copy.
loadDotenv({ path: `.env.${process.env.NODE_ENV}`, quiet: true });
const { otlpEndpoint } = parseOtelConfig(process.env);

if (
  INSTRUMENTED_ENVIRONMENTS.includes(process.env.NODE_ENV ?? '') &&
  otlpEndpoint
) {
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: SERVICE_NAME,
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version,
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.NODE_ENV,
    }),
    traceExporter: new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
    }),
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${otlpEndpoint}/v1/metrics` }),
      }),
    ],
    logRecordProcessors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({ url: `${otlpEndpoint}/v1/logs` }),
      }),
    ],
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    void sdk.shutdown();
  });
} else {
  console.info(
    '[otel] tracing/logs/metrics disabled (no OTEL_EXPORTER_OTLP_ENDPOINT or unrecognized NODE_ENV)',
  );
}
