import {
  type IntegrationAdapterLogContext,
  logIntegrationAdapterBanner,
  logIntegrationAdapterStep,
} from '../../support/integration-adapter-logger';

const LOCAL_INTEGRATION_LOG_CONTEXTS: readonly IntegrationAdapterLogContext[] =
  [
    {
      adapter: 'HTTP',
      boundary: 'http',
      module: 'Nest HTTP controllers',
      target: 'test/http/**/*.integration-spec.ts',
    },
    {
      adapter: 'ESLINT',
      boundary: 'static-analysis',
      module: 'ESLint config',
      target: 'test/eslint/**/*.integration-spec.ts',
    },
    {
      adapter: 'DEPENDENCY_CRUISER',
      boundary: 'architecture-rules',
      module: 'Dependency Cruiser config',
      target: 'test/dependency-cruiser/**/*.integration-spec.ts',
    },
  ];

export default function setup(): void {
  for (const context of LOCAL_INTEGRATION_LOG_CONTEXTS) {
    logIntegrationAdapterBanner(context);
    logIntegrationAdapterStep(
      context,
      'READY',
      'Included in local integration suite',
    );
  }
}
