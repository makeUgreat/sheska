module.exports = {
  frameworkDependency: 'node_modules/.+@nestjs',
  nestCommonDependency: 'node_modules/.+@nestjs[+/]common',
  sourceTestFiles: '(^src/.*/__tests__/|[.](?:spec|test|integration-spec)[.]ts$)',
};
