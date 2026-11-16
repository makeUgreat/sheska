---
title: 모노레포 정책
applies_to:
  - repository
read_when:
  - workspace를 추가, 제거, 재구성할 때
  - 루트 `package.json` script나 static harness를 바꿀 때
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
