---
title: UI 배포
lang: ko
audience: both
applies_to:
  - apps/ui
source: ../en/deployment.md
last_synced: 2026-07-16
read_when: Dockerfile, Cloudflare Pages 설정, vite 빌드 설정을 변경하거나 검토할 때
---

# UI 배포

## 프로덕션

UI는 정적 사이트로 Cloudflare Pages에 배포된다.
CI가 `vite build`를 실행하면 `dist/` 디렉터리에 정적 에셋이 생성된다.
Cloudflare Pages는 이 에셋을 직접 서빙하며, 프로덕션에는 서버 런타임이 없다.

API base URL은 빌드 타임에 `VITE_API_BASE_URL` 환경변수로 결정되며,
Vite가 `import.meta.env`를 통해 정적 번들에 인라인한다.
이 변수는 Cloudflare 빌드 환경에 설정되므로 실제 API URL이 배포 에셋에 하드코딩된다.
`src/main.tsx`의 `/api` fallback은 `vite dev` 로컬 개발 시에만 사용된다.

## Dockerfile

`apps/ui/Dockerfile`은 **E2E 테스트 런타임 전용**이다.
`vite build`로 정적 빌드를 수행한 뒤 `vite preview`로 서빙한다.
이때 `VITE_API_BASE_URL`을 설정하지 않으므로 API base URL은 `/api` fallback으로 빌드된다.
`vite preview`는 컨테이너 시작 시 주입된 `API_BASE_URL` 환경변수를 사용해
`/api` 요청을 실제 API로 런타임에 프록시한다.

Dockerfile은 프로덕션에서 사용하지 않으며 Cloudflare Pages 파이프라인과 무관하다.

Dockerfile을 변경할 때는 프로덕션 배포가 아닌 E2E 테스트 하네스에 대한 변경으로 간주한다.
