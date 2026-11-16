---
title: UI 구조 컨벤션
applies_to:
  - apps/ui
read_when:
  - 새 코드를 어느 layer와 slice에 둘지 정할 때
  - markdown 본문을 읽거나 그리는 코드를 바꿀 때
related:
  - ./design.md
---

# UI 구조 컨벤션

## Layer
- UI는 Feature-Sliced Design을 따름. 의존은 `app → pages → widgets → features → entities → shared` 방향으로만 흐름
- source 폴더는 `01_app`처럼 숫자를 붙임. 파일 목록에서 layer 순서가 보임. import 경로는 숫자 없는 이름(`@/shared/ui`)을 씀
- 새 코드는 아래 기준으로 둠

| layer | 두는 것 |
|---|---|
| `app` | router, provider, shell 배선 |
| `pages` | route 단위 조합. 재사용할 도메인 동작은 두지 않음 |
| `widgets` | feature, entity, shared를 조합한 완결된 UI 덩어리 |
| `features` | 사용자 상호작용과 workflow 상태. 예: 검색 상태, source 발행 |
| `entities` | 도메인 계약, API client, query hook, 최소한의 entity UI |
| `shared` | 도메인이 없는 primitive, API 기반, hook, helper |

- 같은 layer의 slice끼리는 import하지 않음. 공유가 필요하면 아래 layer로 내림
  - 예: 상세 화면 widget끼리 공유할 것이 생기면 `shared`로 내림. 상세 화면은 article 껍데기를 복제하지 않고 `ArticleLayout`을 씀
- slice 밖에서는 slice의 `index.ts`로만 import함. `@/features` 같은 layer 전체 barrel은 만들지 않음
- 이 경계는 ESLint와 dependency-cruiser가 검사함

## Markdown 본문
- post와 source는 같은 vault 파일이라 같은 `Markdown` 컴포넌트와 같은 문법으로 그림
  - 화면마다 문법이 다르면 같은 본문이 어떤 화면에서는 wiki link로, 다른 화면에서는 괄호로 보임
- markdown 처리 코드는 `shared`의 `markdown/` 폴더에 모으고, 폴더 밖에서는 폴더의 `index.ts`로만 import함
- Obsidian 문법 코드는 `markdown/obsidian/` 하위 폴더에 둠
  - 표준 Markdown과 GFM은 라이브러리가 읽지만 vault 문법은 직접 구현해야 함. 폴더가 나뉘면 어떤 복잡도가 vault 문법 때문인지 경로로 보임
- 문법 확장은 렌더링 결과를 훑지 않고 remark plugin으로 AST 단계에서 처리함
  - 어떤 문법이 감싸든 같게 동작하고, 내용을 node value로 가진 code fence는 건드리지 않음
- wiki link는 parse가 끝난 text node에서 찾음
  - 그래서 label 안의 `*`, `~~`, URL은 먼저 다른 node로 쪼개져 link로 읽히지 않음. micromark 확장은 이 경우도 풀지만, 해당하는 노트가 거의 없어 tokenizer를 유지하는 비용이 더 크다고 판단했음
- 렌더링 전에 본문을 알아야 하는 코드(목차, highlighter 판정)는 정규식이 아니라 렌더러와 같은 plugin 목록으로 만든 트리를 읽음. heading id도 트리에 새겨 목차와 렌더링이 같은 id를 얻음
- 다른 노트를 가리키는 wiki link는 resolve되기 전까지 label만 남기고 점선 밑줄로 보임. vault에서 unresolved link는 정상 상태라 숨기지 않음
- 본문 heading은 한 단계씩 낮춤. 페이지 제목이 `<h1>`이라 `#`은 `<h2>`임
  - `#####`와 `######`는 모두 `<h6>`임. vault는 `#`을 `##`의 상위로 자주 쓰므로, 거의 쓰지 않는 가장 깊은 단계를 합침
- `~` 하나는 취소선이 아님(`singleTilde: false`). `1~2장` 같은 한국어 범위 표기가 취소선이 되지 않게 함
- block 표시(`^id`)는 본문에서 지우고 그 block에 anchor id를 남김. 이어질 anchor가 없는 block reference는 unresolved로 남김
