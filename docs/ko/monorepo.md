---
title: 모노레포 정책
applies_to:
  - repository
read_when:
  - workspace나 명령을 추가, 제거, 재구성할 때
  - Obsidian 플러그인의 버전이나 릴리스 workflow를 바꿀 때
---

# 모노레포 정책

## Workspace
- 따로 배포하거나 실행하는 서비스마다 workspace 하나를 둠
- 앱은 다른 앱의 소스를 import하지 않음. 둘 이상의 앱이 쓰는 코드는 `packages/`로 올림
- 공유 workspace는 빌드한 `dist`를 내보냄
  - API runtime은 TypeScript 소스를 읽지 못함

## 명령
- 여러 workspace에 있는 작업은 같은 이름과 같은 뜻으로 둠. 예: `build`, `typecheck`, `lint`, `format`
  - Turborepo는 이름으로 작업을 모음
- 검사 작업은 파일을 고치지 않음. 파일을 고치는 작업은 `format`임
- `lint`는 소스에 규칙을 적용하는 도구를 모두 돌림. 예: eslint, dependency-cruiser
- 한 workspace에만 있는 작업은 `<대상>:<동사>`로 씀. 예: `db:migrate`
- 테스트 명령은 `test:<경계>`로 씀. 경계는 [실행 단위](testing.md#실행-단위)를 따름
- 명령 이름에 실행 방식(watch, coverage)을 붙이지 않고, 묶음 명령을 두지 않음. 예외는 `turbo.json`의 `test`임
  - 이름과 묶음에 기준이 섞이면 무엇이 도는지 이름에서 보이지 않음
- 루트에는 앱 명령의 alias를 두지 않음. 저장소 전체 실행은 `turbo run`으로 함
- (미구현) 루트 `rules:check`는 테스트가 없는 도메인 규칙이 남아 있어 `turbo run lint`에 넣지 않았음

## Turborepo
- cache 입력(`inputs`)을 좁히지 않음
  - 바뀐 파일이 hash에서 빠지면 이전의 통과 결과가 그대로 돌아옴
- 원격 cache를 쓰지 않음
  - 저장소가 public이라 fork PR이 cache에 결과를 쓸 수 있음

## 플러그인 릴리스
- release-please가 커밋 메시지로 플러그인 버전을 정함. 사람은 버전을 고치지 않음
- 호환을 깨는 변경은 PR 제목에 `!`를 붙임. 예: `feat!: ...`
  - squash 머지에서는 PR 제목이 커밋 메시지가 됨
- 릴리스 태그는 `v` 없이 버전만 씀
  - Obsidian과 BRAT는 태그와 `manifest.json`의 버전이 같다고 가정함

## CI
- self-hosted runner(홈 서버)를 쓰는 workflow에는 `pull_request` trigger를 붙이지 않음
  - 저장소가 public이라 fork PR의 코드가 홈 서버에서 실행됨
- PR 검사는 바뀐 workspace와 그 workspace에 기대는 workspace만 돌림. master push 검사는 cache 없이 전부 돌림
  - master 검사가 PR 검사가 놓친 실패를 잡음
- 필수 check는 결과를 모으는 `ci` job과 `pr-title`만 둠
  - GitHub은 건너뛴 필수 check를 통과로 셈. `ci` job은 앞 job이 실패해도 건너뛰지 않고 실패로 끝남
