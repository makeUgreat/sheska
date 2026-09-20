/** @type {import('dependency-cruiser').IConfiguration} */
const { join } = require('node:path');

const fsdBoundaryRules = require('./rules/fsd-boundaries.cjs');

module.exports = {
  extends: '../../../.dependency-cruiser.cjs',
  forbidden: [
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
    ...fsdBoundaryRules,
  ],
  options: {
    exclude: {
      path: ['^dist/', '^coverage/', '^storybook-static/'],
    },
    includeOnly: ['^src/', '^test/', '^node_modules/', '^../../node_modules/'],
    tsConfig: {
      fileName: join(__dirname, '../tsconfig.json'),
    },
  },
};
