---
title: 모노레포 정책
lang: ko
audience: both
applies_to:
  - repository
source: ../en/monorepo.md
last_synced: 2026-07-07
---

# 모노레포 정책

이 저장소는 pnpm monorepo다.
저장소 단위 정책은 workspace를 어떻게 발견할지, 루트 명령어가 어떤 의미를 가져야 하는지, 어떤 검사를 monorepo harness에 포함할지를 결정한다.

## 적용 범위

- workspace를 추가, 제거, 재구성할 때 이 문서를 사용한다.
- 루트 `package.json` script를 변경할 때 이 문서를 사용한다.
- 한 앱 내부에만 적용되는 규칙은 앱별 컨벤션 인덱스를 사용한다.

## Workspace 소유권

- 배포 가능하거나 독립적으로 실행 가능한 각 서비스는 자기 workspace에 속한다.
- workspace는 자신의 package script, local static check, test, build command, app-specific dependency rule을 소유한다.
- 둘 이상의 앱이 production code로 import해야 하는 공유 코드는 전용 shared workspace로 승격해야 한다.
- 앱은 다른 앱의 `src` 파일을 직접 import하지 않는 것을 원칙으로 한다. 앱 간 contract는 package dependency, generated client, schema, API, 또는 전용 shared workspace를 통해 이동해야 한다.

## Workspace 간 런타임 테스트 정책

한 workspace의 통합 테스트가 다른 서비스를 실행해야 한다면, 실행되는 서비스가 test runtime command를 소유한다.
소비하는 workspace는 그 서비스를 black-box runtime dependency로 보고, 검증하려는 public protocol을 통해 통신해야 한다.

- Workspace는 자기 테스트를 위해 다른 앱의 `src` 파일, framework module, test-only internal을 import해서 그 앱을 compose해서는 안 된다.
- 다른 workspace가 어떤 서비스를 대상으로 테스트해야 한다면, 해당 service workspace는 재사용 가능한 test runtime package script를 제공하는 것이 좋다. 예를 들어 API workspace는 필요한 database, queue, migration, environment, application server, readiness check, shutdown behavior를 시작하는 test runtime command를 제공할 수 있다.
- 기본 reusable service runtime에는 `test:runtime:start`, `test:runtime:wait`, `test:runtime:url`, `test:runtime:stop`을 사용한다. 한 workspace가 여러 public runtime boundary를 의도적으로 제공할 때만 `test:runtime:http:start` 같은 boundary segment를 추가한다.
- 소비하는 workspace는 `pnpm --filter <workspace> <script>` 또는 그 filtered package script에 위임하는 local harness를 통해 다른 서비스를 시작하는 것을 원칙으로 한다.
- Producing workspace는 compose file, test environment variable, migration, seed, port, readiness check, cleanup처럼 service-specific test runtime에 필요한 runtime detail을 소유한다.
- Consuming workspace는 자신의 contract test와 base URL 같은 필요한 public endpoint configuration만 소유한다.
- 포트 충돌을 피하기 위해 runtime이 dynamic host port를 사용한다면, producing workspace는 consumer가 compose 내부 구조를 몰라도 되도록 `test:runtime:url`로 endpoint를 제공해야 한다.
- 동시에 사용될 수 있는 runtime command는 `SHESKA_TEST_RUNTIME_ID` 같은 caller-provided runtime identifier를 지원하고, 이를 Docker Compose project name 같은 runtime-owned resource 격리에 사용하는 것이 좋다.
- Service-specific runtime harness는 소유 workspace에 두는 것을 선호한다. 여러 workspace가 같은 reusable runtime abstraction을 필요로 하게 된 뒤에만 shared harness package로 승격한다.
- Workspace가 앱이라는 이유만으로 `test:runtime:*` script를 만들 필요는 없다. 다른 workspace가 해당 앱을 runtime dependency로 필요로 할 때만 추가한다.

## Ignore 파일 정책

루트 `.gitignore`는 모든 workspace에 공통으로 적용되는 generated file, dependency, test-output pattern을 소유한다.
Workspace `.gitignore` 파일은 선택 사항이며, 루트 pattern으로 커버되지 않는 workspace-specific generated file만 담아야 한다.

- Workspace `node_modules/`, `dist/`, `build/`, `coverage/`, `.nyc_output/` 같은 shared pattern은 루트 `.gitignore`에 둔다.
- Vite timestamp file이나 bundled Obsidian `main.js`처럼 tool-specific 또는 app-specific output은 소유 workspace의 `.gitignore`에 둔다.
- 공통 루트 ignore pattern을 모든 workspace `.gitignore`에 반복하지 않는다.
- Workspace-specific ignore file이 없다면 해당 workspace는 `.gitignore`를 가질 필요가 없다.

## 루트 명령어 정책

루트 `package.json` script는 저장소 단위 workflow를 나타낸다.
특정 앱 명령어의 짧은 alias여서는 안 된다. 그런 alias는 monorepo가 커질수록 소유권을 숨기고 명령어 범위를 모호하게 만든다.

- 저장소 루트에서 특정 workspace 명령을 의도적으로 실행할 때는 `pnpm --filter <workspace> <script>`를 사용한다.
- Recursive pnpm command는 여러 workspace에 적용하려는 workflow에만 사용한다.
- 여러 workspace의 파일을 변경하는 루트 `lint` script는 피한다. 넓은 formatting change가 의도된 경우가 아니라면 fix command는 소유 workspace에서 실행한다.

## Static Harness 정책

`harness:static`은 저장소 단위 static verification gate다.
루트 명령은 저장소가 소유한 static check를 먼저 실행한 뒤, workspace가 소유한 static harness를 재귀적으로 실행하는 것을 원칙으로 한다.

```bash
pnpm deps:check && pnpm -r --if-present harness:static
```

루트 `deps:check` 명령은 저장소 단위 dependency boundary check를 소유한다.
이 명령은 앱 내부 layer rule이 아니라 workspace 간 boundary를 검사해야 한다.

Static verification에 참여하는 각 workspace는 자신의 `harness:static` script를 소유한다.
그 script는 해당 workspace에 의미 있는 static check를 조합해야 한다. 예를 들어 `typecheck`, `lint:check`, dependency-boundary check가 이에 해당한다.

`harness:static`이 전체 static gate를 이미 소유한다면 루트 `typecheck`나 `lint:check` script는 필수가 아니다.
Full harness와 별도로 명확한 저장소 단위 사용 사례가 있을 때만 별도 루트 aggregate command를 추가한다.

## 리뷰 체크

- 루트 script 이름은 저장소 전체 범위가 명확해야 한다.
- 특정 앱만 대상으로 하는 명령이라면 docs, hook, CI에서 명시적인 `pnpm --filter <workspace> <script>` 호출을 선호한다.
- dependency rule이 workspace 간 boundary를 설명한다면 루트 `deps:check`에 추가한다.
- 한 workspace에 새 static check가 필요하면 그 workspace의 `harness:static`에 추가한다.
- 모든 workspace에 새 static check가 필요하면 이 문서에 기대사항을 정의하고, 각 workspace가 그 기대사항을 만족하는 local command를 조합하게 한다.
