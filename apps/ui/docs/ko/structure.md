---
title: UI 구조 컨벤션
applies_to:
  - apps/ui
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

`features`는 archive search state나 source publishing 같은 user interaction과 workflow state를 소유한다.

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

## Markdown 본문 규약

Note 본문과 post 본문은 같은 markdown 규약을 쓴다. Post는 note와 같은 source에서 published되므로 본문 문법이 갈라지지 않는다.

이 규약의 구현은 `shared`가 소유한다. Markdown 처리 코드는 segment 안의 `markdown/` 폴더에 모으고, 폴더의 `index.ts`가 반대쪽 segment와 segment public API에 내보내는 목록이 된다. 폴더 밖 `shared` 코드도 폴더 내부 파일이 아니라 이 `index.ts`로 import한다.

- `shared/lib/markdown/`: 본문을 어떻게 읽을지 정한다. `MARKDOWN_PLUGINS`(본문 문법 목록), `parseMarkdown`(렌더러와 같은 목록으로 본문을 트리로), `remarkHeadingId`(heading에 id를 새김), `parseOutline`(트리의 heading과 id를 outline으로), `useArticleOutline`(본문에서 outline과 현재 heading을 계산).
- `shared/lib/markdown/obsidian/`: Vault의 Obsidian 문법을 읽는다. `OBSIDIAN_SYNTAX`(GFM 설정과 Obsidian 확장 plugin 목록), `remarkBlockAnchor`(block 표시를 anchor로), `remarkWikiLink`(wiki link 문법), `parseWikiLink`(`[[target#anchor|label]]`의 안쪽을 target, anchor, label로 분해).
- `shared/ui/markdown/`: 읽은 본문을 어떻게 그릴지 정한다. `Markdown`(모든 본문이 공유하는 문법과 typography), `CodeBlock`과 지연 로딩되는 highlighter.
- `shared/ui/markdown/obsidian/`: Obsidian 문법이 만든 element를 그린다. `WikiLink`(wiki link element).

Obsidian 문법 코드는 `obsidian/` 하위 폴더에 모은다. 표준 Markdown과 GFM은 라이브러리가 읽지만 vault 문법은 직접 구현해야 해서 markdown 코드 대부분이 여기서 나온다. 폴더로 나눠 두면 어떤 복잡도가 vault 문법 때문인지 경로만 보고 알 수 있다. 하위 폴더는 `markdown/` 모듈의 내부이므로 모듈 밖에서는 여전히 `markdown/index.ts`로만 import한다.

- `shared/ui`: `ArticleOutline`(목차), `ArticleLayout`(article header + 본문 + footer + 목차 배치). Markdown 문법이 아니라 article 배치를 다루므로 `markdown/` 밖에 둔다.

Note, post, source 본문은 모두 같은 vault 파일이므로 `Markdown` 하나로 같은 문법을 거쳐 그린다. 화면마다 문법을 다르게 두면 같은 본문이 어떤 화면에서는 wiki link로, 어떤 화면에서는 날것의 괄호로 보인다.

Wiki link는 특정 entity의 표현이 아니라 이 앱 markdown 본문의 문법이므로 `shared`에 둔다. Target 없이 anchor만 있는 `[[#^id|label]]`은 같은 본문 안의 block을 가리키므로 API 없이 그 자리에서 이어진다. 다른 노트를 가리키는 link는 API가 resolved target을 돌려주기 전까지 unresolved 상태이며, note 본문이든 post 본문이든 label만 남기고 점선 underline으로 표시한다. Vault에서 unresolved link는 오류가 아니라 정상 상태이므로 숨기지 않는다.

Page 제목이 `<h1>`이므로 본문 heading은 그 아래 단계에 놓인다. 본문의 heading은 모두 한 단계씩 낮춰 `#`은 `<h2>`, `#####`는 `<h6>`로 렌더한다. HTML heading은 `<h6>`까지뿐이라 `######`는 `#####`와 같은 `<h6>`에 둔다. 두 단계는 어딘가에서 합쳐야 하는데, vault는 `#`을 `##`의 상위 섹션으로 자주 쓰므로 거의 쓰지 않는 가장 깊은 단계를 합친다. Vault는 heading을 구조가 아니라 크기로 쓰는 경우가 많아서 `####`만 쓰는 노트가 흔한데, 얕은 단계로 끌어올리면 저자가 나눈 구조가 무너진다.

Vault는 block 표시(`^c58057`)로 본문의 한 block에 이름을 붙인다. `remarkBlockAnchor`가 이 표시를 본문에서 지우고 그 block에 anchor id를 남긴다. 표시가 어떤 block에 붙었는지는 문법에 따라 달라서, callout 마지막 줄에 붙으면 인용 한 덩어리를, 표 바로 뒤에 붙으면 표 전체를, tight list 항목 끝에 붙으면 그 항목을 가리킨다. 이어질 anchor가 본문에 없는 block reference는 이동할 곳이 없으므로 unresolved로 남긴다.

문법 확장은 rendering 결과를 훑는 것이 아니라 remark plugin으로 markdown AST 단계에서 처리한다. 강조나 표처럼 어떤 문법이 감싸고 있든 같게 동작해야 하고, 내용을 node value로 들고 있는 code fence는 건드리지 않아야 하기 때문이다. Component mapping은 plugin이 만든 element만 그리고, 문법 자체를 다시 해석하지 않는다.

Wiki link는 parse가 끝난 text node에서 찾는다. 그래서 label 안의 `*`, `~~`, URL은 parser가 먼저 다른 node로 쪼개 link로 읽지 못한다. Parse 단계의 문법 확장(micromark)으로 읽으면 이 경우도 풀리지만, vault에서 해당하는 노트가 거의 없어 tokenizer를 직접 유지하는 비용이 더 크다고 판단했다.

목차, highlighter 판정처럼 렌더링 전에 본문을 알아야 하는 코드는 문자열을 정규식으로 훑지 않고 `parseMarkdown`이 렌더러와 같은 plugin 목록으로 만든 트리를 읽는다. Heading id는 `remarkHeadingId`가 트리에 새기므로, 목차와 렌더링이 따로 짝을 맞추지 않아도 같은 id를 얻는다. 같은 slug가 여러 번 나오면 source line을 붙인다.

Vault는 Obsidian 문법이므로 `~` 하나는 취소선이 아니다(`singleTilde: false`). `1~2장 그리고 3~4장` 같은 한국어 범위 표기가 취소선으로 바뀌지 않게 한다.

상세 화면 widget은 이 규약을 다시 구현하지 않는다. Entity마다 다른 것은 data fetching과 header, footer의 내용뿐이며, 나머지는 `ArticleLayout`에 넘긴다. 같은 layer의 `note-article`과 `post-article`은 서로 import할 수 없으므로, 공유할 것이 생기면 이 규약처럼 `shared`로 내린다.

## 정적 검사

ESLint는 production `src` FSD boundary를 검사한다.

- 위쪽 layer import 금지;
- 같은 layer의 slice 간 직접 import 금지;
- 다른 slice의 internal segment로 들어가는 cross-slice import 금지.

dependency-cruiser(`pnpm deps:check`)는 해석된 파일 경로로 같은 boundary를 한 번 더 검사하고, `shared` segment 안의 모듈 폴더(`shared/lib/markdown/` 같은 것)도 막는다.

- 모듈 폴더 밖에서는 폴더의 `index.ts`로만 import한다;
- 한 모듈 폴더에서 다른 모듈 폴더로 갈 때도 상대의 `index.ts`로만 import한다.

Spec, story, `test/**`는 직접 검증하거나 문서화하는 unit을 import할 수 있다. 이 static rule 자체는 `pnpm test:static`으로 검증하며 `pnpm harness:static`에 포함된다.

## 리뷰 체크

- 새 reusable domain UI는 page가 아니라 entity 또는 widget slice에 둔다.
- 새 user interaction state는 feature slice에 둔다.
- 새 route composition은 page slice에 둔다.
- 새 domain-free primitive code는 `shared`에 둔다.
- Public API export는 좁고 의도적으로 유지한다.
- 상세 화면을 새로 만들 때는 article 껍데기를 복제하지 말고 `ArticleLayout`을 쓴다.
