const docs = require('../docs.cjs');

module.exports = [
  {
    name: 'api-core-is-independent',
    severity: 'error',
    comment:
      'Core contains project-independent primitives and must not import API layers, contexts, platform, or shared domain concepts. ' +
      `See ${docs.sourceDependency}#core.`,
    from: {
      path: '^src/core/',
    },
    to: {
      path: '^src/(platform|contexts|kernels)/',
    },
  },
  {
    name: 'api-kernels-stay-in-layer',
    severity: 'error',
    comment:
      'Kernels may depend only on core and their own kernel. Feature policy belongs in the owning bounded context. ' +
      `See ${docs.sourceDependency}#kernel-directories.`,
    from: {
      path: '^src/kernels/([^/]+)/',
    },
    to: {
      path: '^src/',
      pathNot: '^src/(core/|kernels/$1/)',
    },
  },
  {
    name: 'api-domain-stays-inner',
    severity: 'error',
    comment:
      'Domain code must stay independent of application, infrastructure, presentation, platform, and framework concerns. ' +
      `See ${docs.sourceDependency}#domain-layer.`,
    from: {
      path: '^src/contexts/([^/]+)/domain/',
    },
    to: {
      path: '^src/',
      pathNot: '^src/(core/|kernels/domain/|contexts/$1/domain/)',
    },
  },
  {
    name: 'api-application-stays-inner',
    severity: 'error',
    comment:
      'Application code may use domain contracts and application policy, but must not import outer adapters or platform code. ' +
      `See ${docs.sourceDependency}#application-layer.`,
    from: {
      path: '^src/contexts/([^/]+)/application/',
    },
    to: {
      path: '^src/',
      pathNot:
        '^src/(core/|kernels/application/|contexts/$1/(domain|application)/)',
    },
  },
  {
    name: 'api-infrastructure-not-to-presentation-or-platform',
    severity: 'error',
    comment:
      'Infrastructure adapters implement technical details and must not depend on presentation adapters or platform wiring. ' +
      `See ${docs.sourceDependency}#infrastructure-layer.`,
    from: {
      path: '^src/contexts/[^/]+/infrastructure/',
    },
    to: {
      path: '^src/(platform/|contexts/[^/]+/presentation/)',
    },
  },
  {
    name: 'api-presentation-not-to-domain-infrastructure-or-platform',
    severity: 'error',
    comment:
      'Presentation should call application use cases and map protocol concerns; it must not reach into domain internals, infrastructure adapters, or platform wiring. ' +
      `See ${docs.sourceDependency}#presentation-layer.`,
    from: {
      path: '^src/contexts/([^/]+)/presentation/',
    },
    to: {
      path: '^src/(platform/|contexts/$1/(domain|infrastructure)/)',
    },
  },
  {
    name: 'api-not-to-other-context-internals',
    severity: 'error',
    comment:
      'Bounded contexts must not depend on another context internal model or adapter. Communicate through IDs, DTOs, events, ports, or public application contracts. ' +
      `See ${docs.sourceDependency}#source-direction.`,
    from: {
      path: '^src/contexts/([^/]+)/',
    },
    to: {
      path: '^src/contexts/(?!$1/)[^/]+/(domain|infrastructure|presentation)/',
    },
  },
  {
    name: 'api-not-to-kernel-internals',
    severity: 'error',
    comment:
      'Production code outside kernels must import kernel contracts through the kernel public surface. ' +
      `See ${docs.sourceDependency}#import-path-policy.`,
    from: {
      path: '^src/',
      pathNot: '^src/kernels/',
    },
    to: {
      path: '^src/kernels/[^/]+/(?!index[.]ts$)',
    },
  },
  {
    name: 'api-not-to-domain-internals',
    severity: 'error',
    comment:
      'Production code outside a domain directory must import domain contracts through the domain public surface. ' +
      `See ${docs.sourceDependency}#import-path-policy.`,
    from: {
      path: '^src/',
      pathNot: '^src/contexts/[^/]+/domain/',
    },
    to: {
      path: '^src/contexts/[^/]+/domain/(?!index[.]ts$)',
    },
  },
  {
    name: 'api-not-to-application-port-internals',
    severity: 'error',
    comment:
      'Production code outside application ports must import port contracts through the ports public surface. ' +
      `See ${docs.sourceDependency}#import-path-policy.`,
    from: {
      path: '^src/',
      pathNot: '^src/contexts/[^/]+/application/ports/',
    },
    to: {
      path: '^src/contexts/[^/]+/application/ports/(?!index[.]ts$)',
    },
  },
];
