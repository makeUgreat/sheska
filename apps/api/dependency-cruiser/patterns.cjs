// `@nestjs/x`가 실제로 설치된 디렉터리만 매칭한다. pnpm 가상 스토어 디렉터리 이름
// (`.pnpm/@nestjs+event-emitter@3.1.0_@nestjs+common@11.1.27_.../`)에는 peer dependency가
// 인코딩되어 있어서, `@nestjs+common`을 느슨하게 매칭하면 @nestjs/common에 peer로 의존하는
// 모든 패키지가 예외 처리된다. 마지막 `node_modules/@nestjs/<pkg>/` 구간에 고정해야 한다.
const { builtinModules } = require('node:module');

module.exports = {
  // dependency-cruiser는 Node 내장 모듈을 `node:` 없이 `crypto`처럼 이름만으로 resolve한다.
  nodeBuiltinModule: `^(${builtinModules.join('|')})$`,
  frameworkDependency: 'node_modules/@nestjs/',
  nestCommonDependency: 'node_modules/@nestjs/common/',
  sourceTestFiles: '(^src/.*/__tests__/|[.](?:spec|test|integration-spec)[.]ts$)',
};
