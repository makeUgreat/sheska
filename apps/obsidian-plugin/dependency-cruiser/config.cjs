/** @type {import('dependency-cruiser').IConfiguration} */
const { join } = require('node:path');

const sourceDependencyRules = require('./rules/source-dependency.cjs');

module.exports = {
  extends: '../../../.dependency-cruiser.cjs',
  forbidden: [...sourceDependencyRules],
  options: {
    exclude: {
      path: ['^src/.*\\.spec\\.ts$'],
    },
    includeOnly: ['^src/', '^node_modules/'],
    tsConfig: {
      fileName: join(__dirname, '../tsconfig.json'),
    },
  },
};