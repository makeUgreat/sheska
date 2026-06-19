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
      name: 'not-to-unresolvable',
      severity: 'error',
      comment:
        'Imports must resolve to a real local file, package dependency, or Node built-in module.',
      from: {},
      to: {
        couldNotResolve: true,
      },
    },
  ],
  options: {
    combinedDependencies: true,
    doNotFollow: {
      path: 'node_modules',
    },
    moduleSystems: ['cjs', 'es6'],
    parser: 'swc',
    tsPreCompilationDeps: 'specify',
  },
};
