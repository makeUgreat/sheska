const docs = require('../docs.cjs');
const { frameworkDependency, sourceTestFiles } = require('../patterns.cjs');

module.exports = [
  {
    name: 'api-not-to-platform-from-production',
    severity: 'error',
    comment:
      'Platform is runtime wiring. Only src/main.ts and platform code may import it; move shared contracts inward instead of importing concrete platform types. ' +
      `See ${docs.runtimeWiring}#platform.`,
    from: {
      path: '^src/',
      pathNot: `^src/(main[.]ts|platform/)|${sourceTestFiles}`,
    },
    to: {
      path: '^src/platform/',
    },
  },
  {
    name: 'api-inner-layers-not-to-frameworks',
    severity: 'error',
    comment:
      'Core, domain, kernels, and application core must stay framework-independent. Keep framework decorators and SDK imports in platform, feature root modules, presentation, or infrastructure adapters. ' +
      `See ${docs.runtimeWiring}#nestjs-di.`,
    from: {
      path: [
        '^src/core/',
        '^src/kernels/',
        '^src/contexts/[^/]+/domain/',
        '^src/contexts/[^/]+/application/',
      ],
    },
    to: {
      path: frameworkDependency,
    },
  },
];
