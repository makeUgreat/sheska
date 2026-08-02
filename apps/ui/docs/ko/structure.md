---
title: UI 구조 컨벤션
lang: ko
audience: both
applies_to:
  - apps/ui
source: ../en/structure.md
related:
  - ./index.md
  - ./test.md
---

# UI 구조 컨벤션

## 범위

`apps/ui`의 source directory, feature boundary, import direction, reusable UI 위치를 만들거나 옮기거나 검토할 때 이 문서를 사용한다.

UI 앱은 가벼운 Feature-Sliced Design 방향을 따른다. 구조는 모든 FSD layer나 segment를 미리 강제하기보다, ownership과 dependency direction을 명확히 하는 데 집중한다.

## 레이어 모델

앱이 커질수록 다음 top-level source area를 선호한다.

```txt
src/
  app/
  pages/
  features/
  entities/
  shared/
  styles/
```

`app`은 provider, router setup, application shell composition 같은 bootstrap wiring을 소유한다.

`pages`는 route-level composition을 소유한다. Page는 feature, entity, shared UI를 조합할 수 있지만 reusable domain behavior를 소유하는 것은 피한다.

`features`는 posts archive, posts search, publishing flow, source synchronization flow 같은 user-facing domain behavior를 소유한다.

`entities`는 여러 feature나 page에서 공유되는 domain object와 reusable contract, API query hook, mapper, 작은 entity UI를 소유한다.

`shared`는 primitive UI, generic hook, formatting helper, HTTP infrastructure, test utility처럼 domain-free building block을 소유한다.

`styles`는 global style, generated theme CSS, design-token artifact를 소유한다.

## 라이트 FSD 정책

패턴을 만족시키기 위해 빈 FSD folder를 만들지 않는다.

실제 ownership boundary가 있을 때 `features`, `entities`, `shared`로 코드를 옮기는 것을 선호한다.

- 하나의 user workflow에 묶인 hook이나 component는 해당 feature 아래에 둔다.
- domain knowledge가 없는 hook, helper, UI primitive는 `shared` 아래에 둔다.
- 여러 feature나 page가 필요로 하는 domain contract 또는 reusable domain-specific query hook은 `entities` 아래에 둔다.
- Route file은 `pages` 아래에 두고, 주로 하위 layer를 조합하는 역할을 맡긴다.

작은 feature는 처음부터 `ui/`, `model/`, `api/` segment를 강제하지 않고 `components/`, `hooks/`, `api/` 이름을 유지할 수 있다. 해당 slice에서 모호함을 줄일 때 FSD segment 이름을 도입한다.

## Import 방향

의존성은 아래 방향을 향해야 한다.

```txt
app -> pages -> features -> entities -> shared
```

하위 layer는 상위 layer를 import하지 않는다. 예를 들어 `shared`는 `features`나 `pages`를 import하지 않고, `features`는 `pages`나 `app`을 import하지 않는다.

ESLint 설정은 새 FSD directory에 대해 가장 중요한 layer direction rule을 검사한다. 구조가 바뀌면 문서와 lint rule을 함께 맞춘다.

## 마이그레이션 가이드

동작을 유지하면서 review size를 작게 유지하는 점진적 이동을 선호한다.

좋은 첫 이동은 다음과 같다.

```txt
src/hooks/use-debounced-value.ts
-> src/shared/hooks/use-debounced-value.ts

src/components/ui/*
-> src/shared/ui/*

src/hooks/use-posts-archive.ts
src/hooks/use-infinite-posts-scroll.ts
src/components/post/*
-> src/features/posts/*
```

파일을 옮길 때는 import와 가까운 test를 같은 변경에서 함께 수정한다. 이동을 보존하기 위해 필요한 경우가 아니라면 structural migration과 unrelated behavior change를 한 변경에 섞지 않는다.
