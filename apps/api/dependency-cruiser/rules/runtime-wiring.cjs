const docs = require('../docs.cjs');
const {
  frameworkDependency,
  nestCommonDependency,
  sourceTestFiles,
} = require('../patterns.cjs');

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
      'Core, domain, and kernels must stay framework-independent. Keep framework decorators and SDK imports in platform, feature root modules, presentation, infrastructure adapters, or the narrow application DI exception. ' +
      `See ${docs.runtimeWiring}#nestjs-di.`,
    from: {
      path: [
        '^src/core/',
        '^src/kernels/',
        '^src/contexts/[^/]+/domain/',
      ],
    },
    to: {
      path: frameworkDependency,
    },
  },
  {
    name: 'api-application-not-to-non-di-nest-frameworks',
    severity: 'error',
    comment:
      'Application code may use @nestjs/common only for narrow DI metadata. Keep other NestJS runtime APIs outside application code. ' +
      `See ${docs.runtimeWiring}#nestjs-di.`,
    from: {
      path: '^src/contexts/[^/]+/application/',
    },
    to: {
      path: frameworkDependency,
      pathNot: nestCommonDependency,
    },
  },
];
