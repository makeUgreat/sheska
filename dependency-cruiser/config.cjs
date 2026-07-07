/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
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
