---
title: 모노레포 정책
applies_to:
  - repository
read_when:
  - workspace를 추가, 제거, 재구성할 때
  - 루트 `package.json` script나 static harness를 바꿀 때
related:
  - ./testing.md
---

# 모노레포 정책

## Workspace
- 배포하거나 따로 실행할 수 있는 서비스마다 workspace 하나를 둠. workspace는 자기 script, 검사, 테스트, 의존 규칙을 소유함
- 앱은 다른 앱의 `src`를 import하지 않음. 앱 사이의 계약은 package, API, 공유 workspace로 오감
- 둘 이상의 앱이 production 코드로 import하는 코드는 `packages/` 아래 공유 workspace로 올림. 예: `packages/contract`
- 공유 workspace는 소스가 아니라 `tsc`로 빌드한 `dist`를 내보냄
  - API는 CommonJS로 컴파일한 JS를 node로 실행함. 소스를 내보내면 API runtime이 읽지 못함
  - `dist`는 `pnpm install`의 `prepare`가 만듦. 공유 workspace의 소스를 고치면 그 workspace의 `build`나 `dev`를 실행해야 앱이 바뀐 내용을 봄
- 앱의 Dockerfile은 `pnpm install --filter <app>...`으로 공유 workspace까지 설치함. `...`가 없으면 `prepare`가 돌지 않음
- 모든 workspace에 공통인 ignore 패턴은 루트 `.gitignore`에, 한 workspace만의 생성 파일은 그 workspace의 `.gitignore`에 둠

## 루트 명령
- 루트 script는 저장소 단위 workflow만 나타냄. 특정 앱 명령의 짧은 alias를 두지 않음
  - alias는 workspace가 늘수록 소유권을 숨김. 특정 앱 명령은 `pnpm --filter <workspace> <script>`로 실행함
- 여러 workspace의 파일을 바꾸는 루트 `lint` script는 두지 않음. 고치는 명령은 소유 workspace에서 실행함

## Static Harness
- `harness:static`은 저장소 단위 정적 검사 관문임. 루트가 소유한 검사를 먼저 돌리고 각 workspace의 `harness:static`을 재귀로 돌림
- 루트 `deps:check`는 workspace 사이의 경계만 검사함. 앱 안의 layer 규칙은 각 앱이 검사함
- 루트 `rules:check`는 nocap으로 도메인 규칙과 테스트 태그를 검사함
  - 도메인 문서와 그 테스트가 여러 workspace에 걸쳐 있어 루트가 소유함
  - (미구현) 테스트가 없는 규칙이 남아 있어 아직 `harness:static`에 넣지 않았음
- 새 정적 검사가 한 workspace에만 필요하면 그 workspace의 `harness:static`에 넣음
