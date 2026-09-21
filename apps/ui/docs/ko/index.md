---
title: UI 컨벤션 인덱스
applies_to:
  - apps/ui
related:
  - ./design.md
  - ./design-token.md
  - ./structure.md
  - ./visual-regression.md
  - ./test.md
  - ./deployment.md
---

# UI 컨벤션 인덱스

## 읽기 규칙

현재 작업과 관련 있는 `apps/ui` 컨벤션 문서만 읽는다.
공개 프로젝트 Markdown 문서를 변경할 때는 repository documentation convention index도 함께 읽는다.

## 라우팅

- `apps/ui` visual design, CSS structure, design token, typography, color, spacing, component styling을 결정하거나 변경할 때: [디자인 시스템](./design.md), [디자인 토큰](./design-token.md)을 읽는다.
- `apps/ui` source directory, feature boundary, import direction, reusable UI 위치를 결정하거나 변경할 때: [UI 구조 컨벤션](./structure.md)을 읽는다.
- `apps/ui`의 Playwright screenshot, pixel-diff, Stitch visual fidelity, visual baseline, browser-rendered design regression을 결정하거나 변경할 때: [UI Visual Regression 컨벤션](./visual-regression.md)을 읽는다.
- `apps/ui` test file, test structure, test command를 선택하거나 변경할 때: [UI 테스트 컨벤션](./test.md)을 읽는다.
- Dockerfile, Cloudflare Pages 설정, vite 빌드 설정을 변경하거나 검토할 때: [UI 배포](./deployment.md)를 읽는다.
