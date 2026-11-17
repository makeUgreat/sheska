---
title: 모노레포 정책
applies_to:
  - repository
read_when:
  - workspace를 추가, 제거, 재구성할 때
  - 루트 `package.json` script나 static harness를 바꿀 때
  - Obsidian 플러그인의 버전이나 릴리스 workflow를 바꿀 때
---

# 모노레포 정책

## Workspace
- 따로 배포하거나 실행하는 서비스마다 workspace 하나를 두고, workspace가 자기 script와 검사를 소유함
- 앱은 다른 앱의 소스를 import하지 않음. 둘 이상의 앱이 쓰는 코드는 `packages/`의 공유 workspace로 올림
- 공유 workspace는 소스가 아니라 빌드한 `dist`를 내보냄. API runtime은 TypeScript 소스를 읽지 못함
  - 공유 workspace의 소스를 고치면 그 workspace를 다시 빌드해야 앱이 바뀐 내용을 봄

## 루트 명령
- 루트 script는 저장소 단위 workflow만 나타냄. 특정 앱 명령의 alias를 두지 않음
  - alias는 workspace가 늘수록 소유권을 숨김

## Static Harness
- `harness:static`은 루트의 검사를 먼저 돌리고 각 workspace의 `harness:static`을 돌림
- 루트 `deps:check`는 workspace 사이의 경계만 검사함
- 루트 `rules:check`는 도메인 규칙과 테스트 태그를 검사함. 도메인 문서와 테스트가 여러 workspace에 걸쳐 있어 루트가 소유함
  - (미구현) 테스트가 없는 규칙이 남아 있어 아직 `harness:static`에 넣지 않았음

## 플러그인 릴리스
- release-please가 커밋 메시지로 Obsidian 플러그인의 버전을 정함. 사람은 버전을 고치지 않음
- 호환을 깨는 변경은 PR 제목에 `!`를 붙임. 예: `feat!: ...`
  - squash 머지에서는 PR 제목이 커밋 메시지가 됨. `!`가 없으면 release-please가 major 버전을 올리지 않음
- 릴리스 태그는 `v` 없이 버전만 씀
  - Obsidian과 BRAT는 태그와 `manifest.json`의 버전이 같다고 가정함
- 실제로 쓰는 vault에는 빌드를 직접 복사하지 않음. 머지 전 확인은 임시 vault에서 함
  - BRAT도 같은 폴더에 쓰므로, 직접 복사하면 실행 중인 버전을 알 수 없게 됨

## CI
- PR 검사는 GitHub-hosted runner에서만 돌림. self-hosted runner에는 `pull_request` 트리거를 붙이지 않음
  - 저장소가 public이라 fork PR의 코드가 홈 서버에서 실행될 수 있음
- Ollama 통합 테스트, UI layout 테스트, E2E는 PR 검사에서 돌리지 않음
  - Ollama 테스트는 모델을 받느라 준비에 최대 6분을 쓰고, layout과 E2E는 browser와 API runtime이 필요함
