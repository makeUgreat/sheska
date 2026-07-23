---
title: UI 컨벤션 인덱스
lang: ko
audience: both
applies_to:
  - apps/ui
source: ../en/index.md
related:
  - ./ui-style.md
  - ./visual-regression.md
  - ./test.md
  - ./deployment.md
---

# UI 컨벤션 인덱스

## 동기화 정책

영어와 한국어 `apps/ui` 컨벤션 문서는 같은 정책을 설명하는 쌍 문서다.
두 문서가 충돌하면 어느 한 언어를 자동으로 우선하지 말고 의도한 정책을 선택해 같은 변경 단위에서 두 문서를 함께 갱신한다.

## 읽기 규칙

현재 작업과 관련 있는 `apps/ui` 컨벤션 문서만 읽는다.
공개 프로젝트 Markdown 문서를 변경할 때는 repository documentation convention index도 함께 읽는다.

## 라우팅

- `apps/ui` visual design, CSS structure, design token, typography, color, spacing, component styling을 결정하거나 변경할 때: [UI 스타일 컨벤션](./ui-style.md)을 읽는다.
- `apps/ui`의 Playwright screenshot, pixel-diff, Stitch visual fidelity, visual baseline, browser-rendered design regression을 결정하거나 변경할 때: [UI Visual Regression 컨벤션](./visual-regression.md)을 읽는다.
- `apps/ui` test file, test structure, test command를 선택하거나 변경할 때: [UI 테스트 컨벤션](./test.md)을 읽는다.
- Dockerfile, Cloudflare Pages 설정, vite 빌드 설정을 변경하거나 검토할 때: [UI 배포](./deployment.md)를 읽는다.
