/** @type {import('dependency-cruiser').IConfiguration} */
const { join } = require('node:path');

const runtimeWiringRules = require('./dependency-cruiser/rules/runtime-wiring.cjs');
const sourceDependencyRules = require('./dependency-cruiser/rules/source-dependency.cjs');

module.exports = {
  extends: '../../.dependency-cruiser.cjs',
  forbidden: [...runtimeWiringRules, ...sourceDependencyRules],
  options: {
    exclude: {
      path: ['^dist/', '^coverage/'],
    },
    includeOnly: [
      '^src/',
      '^test/',
      '^node_modules/',
      '^../../node_modules/',
    ],
    tsConfig: {
      fileName: join(__dirname, 'tsconfig.json'),
    },
  },
};
