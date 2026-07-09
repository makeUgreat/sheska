---
title: 개발 통합 도구
lang: ko
audience: both
applies_to:
  - repository
translation: ../en/dev-integrations.md
---

# 개발 통합 도구

개발 및 테스트 중 사용할 수 있는 외부 도구입니다. CI나 프로덕션에서는 사용하지 않습니다.

통합 시크릿은 `.dev-integrations.env`에 저장합니다 (gitignored, 앱 환경변수 파일과 분리).
`.dev-integrations.env.example`을 복사해서 시작합니다.

## 사용 가능한 통합

| 통합 도구 | 사용 시점 |
|---|---|
| Playwright MCP | 프론트엔드 개발 중 UI 렌더링 확인, 콘솔 에러, 네트워크 요청 검사 |
| PostgreSQL MCP | 개발 DB 쿼리, 스키마 및 데이터 확인. 접속은 `.dev-integrations.env`의 `DEV_DATABASE_URL` 사용. |
| Redis MCP | 개발 캐시 상태, 키, 값 확인. 접속은 `.dev-integrations.env`의 `DEV_REDIS_URL` 사용. |
| Obsidian Local REST API | `apps/obsidian-plugin` 개발 중 실행 중인 Obsidian 인스턴스에 대한 임시 확인 (플러그인 상태, vault 파일, 매니페스트). 인증은 `.dev-integrations.env`의 `OBSIDIAN_REST_API_KEY` 사용. |
| Obsidian MCP | `apps/obsidian-plugin` 개발 중 더 깊은 vault 상호작용이 필요할 때. 인증은 `.dev-integrations.env`의 `OBSIDIAN_MCP_API_KEY` 사용. |
| 홈 k3s 클러스터 | 배포 확인, 로그 검사, 인프라 디버깅. 접속 정보는 `~/WebstormProjects/hash-infra` 참고 — 해당 저장소의 `CLAUDE.md`를 확인. |
