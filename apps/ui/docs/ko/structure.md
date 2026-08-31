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

UI 앱은 코드 위치를 예측 가능하게 만들고 의존성이 한 방향으로 흐르도록 strict Feature-Sliced Design을 따른다.

## 레이어 모델

다음 top-level source layer를 사용한다.

```txt
src/
  01_app/
  02_pages/
  03_widgets/
  04_features/
  05_entities/
  06_shared/
  styles/
```

숫자 prefix는 filesystem과 IDE 목록에서 FSD layer 순서를 유지하기 위해 사용한다.
Public import는 `@/pages/posts`, `@/widgets/posts-archive`, `@/shared/ui`처럼
prefix 없는 FSD layer 이름을 계속 사용한다.

의존성은 아래 방향으로만 흐른다.

```txt
app -> pages -> widgets -> features -> entities -> shared
```

`app`은 router setup, provider 같은 application bootstrap과 shell wiring을 소유한다.

`pages`는 route-level composition을 소유한다. Page slice는 하위 layer를 조합하고 reusable domain behavior를 소유하지 않는 것이 좋다.

`widgets`는 feature, entity, shared UI를 조합한 완결된 UI block을 소유한다.

`features`는 archive search state, post title update, source publishing 같은 user interaction과 workflow state를 소유한다.

`entities`는 domain contract, API client, query hook, 최소 reusable entity UI를 소유한다.

`shared`는 domain-free primitive, API infrastructure, hook, helper, configuration을 소유한다.

`styles`는 global style, generated theme CSS, design-token artifact를 소유한다.

## 슬라이스와 세그먼트

`app`과 `shared`를 제외한 모든 layer는 business concept 또는 route concept 기준의 slice로 나눈다. 같은 layer의 slice끼리는 서로 import해서는 안 된다. 공유가 필요하면 하위 layer로 내려야 한다.

Slice는 root `index.ts`에서 public API를 노출한다. Slice 외부의 production code는 `api/`, `ui/`, `model/` 내부 경로가 아니라 `@/entities/post`, `@/widgets/posts-archive` 같은 public API로 import해야 한다.

Slice 내부에는 다음 표준 segment를 사용한다.

- `ui`: component와 presentation code.
- `model`: state, hook, selector, schema, workflow logic.
- `api`: backend call, query hook, DTO, mapper.
- `lib`: slice-local helper.
- `config`: slice-local configuration.

`app`과 `shared`는 slice 없이 layer 바로 아래에 segment를 둔다. `@/app/shell`, `@/shared/ui`, `@/shared/api`, `@/shared/lib` 같은 segment public API를 사용하며, `@/features`나 `@/app` 같은 layer-root barrel은 추가하지 않는다.

## 정적 검사

ESLint는 production `src` FSD boundary를 검사한다.

- 위쪽 layer import 금지;
- 같은 layer의 slice 간 직접 import 금지;
- 다른 slice의 internal segment로 들어가는 cross-slice import 금지.

Spec, story, `test/**`는 직접 검증하거나 문서화하는 unit을 import할 수 있다. 이 static rule 자체는 `pnpm test:static`으로 검증하며 `pnpm harness:static`에 포함된다.

## 리뷰 체크

- 새 reusable domain UI는 page가 아니라 entity 또는 widget slice에 둔다.
- 새 user interaction state는 feature slice에 둔다.
- 새 route composition은 page slice에 둔다.
- 새 domain-free primitive code는 `shared`에 둔다.
- Public API export는 좁고 의도적으로 유지한다.
