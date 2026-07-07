/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'Circular dependencies make module boundaries hard to reason about. Break the cycle with clearer ownership or dependency inversion.',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'app-not-to-other-app',
      severity: 'error',
      comment:
        'Apps must not import another app workspace directly. Promote shared code into a dedicated shared workspace or communicate through an explicit contract.',
      from: {
        path: '^apps/([^/]+)/',
      },
      to: {
        path: '^apps/(?!$1/)[^/]+/',
      },
    },
  ],
  options: {
    combinedDependencies: true,
    doNotFollow: {
      path: 'node_modules',
    },
    exclude: {
      path: [
        '(^|/)node_modules/',
        '^apps/[^/]+/(dist|coverage)/',
      ],
    },
    moduleSystems: ['cjs', 'es6'],
    parser: 'swc',
    tsPreCompilationDeps: 'specify',
  },
};
