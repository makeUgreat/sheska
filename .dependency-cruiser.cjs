/**
 * 워크스페이스 공용 규칙이자, 루트 실행(`pnpm deps:check`)의 설정이다.
 *
 * 루트 실행은 앱 간 경계(`app-not-to-other-app`) 전용이다. 이 실행에서만 모듈 경로가
 * `apps/<app>/...`로 보이므로 그 규칙의 정규식이 매칭된다. 워크스페이스 실행에서는 경로가
 * `src/...`로 보이고 다른 앱은 `includeOnly` 범위 밖이라 앱 간 import를 볼 수 없다.
 *
 * 반대로 이 실행은 tsconfig를 읽지 않으므로 `@kernels/...`, `@/entities/...` 같은 path
 * alias를 해석하지 못한다. 따라서 앱 내부 간선은 대부분 그래프에 들어오지 않고,
 * `no-circular`를 포함한 나머지 규칙은 여기서 사실상 검증되지 않는다.
 * "no dependency violations found (N modules)" 출력을 앱 내부까지 검사했다는 뜻으로 읽지 말 것.
 *
 * 앱 내부 레이어·순환 검사는 각 워크스페이스의 `deps:check`가 담당한다. 그쪽 설정은 이 파일을
 * extends하고 `tsConfig`를 지정해 alias를 해석하므로, 여기 규칙까지 포함한 상위집합이 된다.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
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
