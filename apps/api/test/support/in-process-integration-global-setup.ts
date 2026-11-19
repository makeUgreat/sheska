import { type IntegrationAdapterLogContext, logIntegrationAdapterBanner, logIntegrationAdapterStep } from './integration-adapter-logger';

const IN_PROCESS_INTEGRATION_LOG_CONTEXTS: readonly IntegrationAdapterLogContext[] = [
  {
    adapter: 'HTTP',
    boundary: 'http',
    module: 'Nest HTTP controllers',
    target: 'test/adapters/http/**/*.integration-spec.ts',
  },
];

export default function setup(): void {
  for (const context of IN_PROCESS_INTEGRATION_LOG_CONTEXTS) {
    logIntegrationAdapterBanner(context);
    logIntegrationAdapterStep(context, 'READY', 'Included in in-process integration suite');
  }
}
