---
title: 글 조회 MVP
lang: ko
audience: both
applies_to:
  - post-reading
source: ../en/post-reading-mvp.md
last_synced: 2026-06-20
---

# 글 조회 MVP

## 의도

Sheska는 사용자가 로컬 Obsidian 작성 흐름에서 선택한 Markdown 글을 호스팅된 블로그로 공개할 수 있게 한다.
첫 제품 기능은 글 조회다. 글 조회가 공개 콘텐츠 모델, 렌더링 기대치, URL 형태, 이후 검색과 RAG의 원천 데이터를 정하기 때문이다.

## 현재 이해

사용자는 로컬 Obsidian에서 글을 작성한다.
명시적으로 공개 대상으로 선택한 글만 Sheska에서 보여야 한다.
공개 whitelist는 frontmatter 필드 `published: true`로 시작한다.

첫 MVP는 공개 Markdown 글을 목록에서 보고 브라우저에서 읽을 수 있음을 검증해야 한다.
이 MVP의 데이터 소스는 앱 내부 샘플 Markdown이며, 사용자의 실제 Obsidian vault나 private GitHub repository가 아니다.

글 조회는 이후 저장소와 AI 기능의 기반이다.
구현은 향후 Obsidian 동기화, private GitHub ingestion, database 기반 검색, RAG indexing을 막는 결정을 피해야 한다.

## MVP 범위

- 앱 내부 샘플 Markdown만 콘텐츠 소스로 사용한다.
- `published: true`를 공개 여부 규칙으로 본다.
- 글 목록과 글 상세 조회 흐름을 제공한다.
- 브라우저에서 읽을 수 있도록 Markdown 콘텐츠를 렌더링한다.
- UI는 최종 블로그 디자인이 아니라 읽기 동작을 검증할 수 있을 만큼만 최소화한다.

## 제외 범위

- 로컬 Obsidian vault와의 동기화.
- private GitHub repository에서 Markdown 가져오기.
- 콘텐츠를 database에 저장하기.
- 검색, embedding, RAG.
- Obsidian attachment path 정식 지원.
- Grafana embed, script, iframe, 기타 raw HTML integration 정식 지원.
- 완성형 블로그 UI.

## 열린 결정

- 앱에 동기화할 whitelisted Obsidian 파일을 어떤 방식으로 app-owned storage에 반영할지.
- 장기적인 콘텐츠 source of truth를 Obsidian repository, app database, 또는 명확한 sync ownership을 가진 양쪽 모두 중 무엇으로 볼지.
- 첨부 이미지를 어떻게 복사, 호스팅, 주소 지정, 권한 처리할지.
- 안전한 공개 렌더링을 위해 어떤 Markdown 및 HTML extension을 허용할지.
- 검색, RAG chunking, embedding refresh를 위해 글 콘텐츠를 어떤 모델로 저장할지.
- slug, title, publication date, tags, summary, draft state를 위한 추가 frontmatter field가 필요한지.

## 동기화 참조

글 조회 동작, 공개 여부 규칙, Markdown source policy, 콘텐츠 ingestion 방향이 바뀌면 이 문서를 함께 동기화한다.
