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
- source 폴더에 숫자를 붙여 layer 순서가 보이게 함. import 경로에는 숫자를 쓰지 않음

| layer | 두는 것 |
|---|---|
| `app` | router, provider, shell 배선 |
| `pages` | route 단위 조합 |
| `widgets` | 완결된 UI 덩어리 |
| `features` | 사용자 상호작용과 workflow 상태 |
| `entities` | 도메인 계약, API client, 최소한의 entity UI |
| `shared` | 도메인이 없는 primitive와 helper |

- 같은 layer의 slice끼리는 import하지 않음. 공유가 필요하면 아래 layer로 내림
- slice 밖에서는 slice의 `index.ts`로만 import함

## Markdown 본문
- post와 source는 같은 vault 파일이라 같은 컴포넌트와 같은 문법으로 그림
- Obsidian 문법 코드는 하위 폴더로 나눔. 어떤 복잡도가 vault 문법 때문인지 경로로 보임
- 문법 확장은 렌더링 결과가 아니라 markdown AST 단계에서 처리함
- 렌더링 전에 본문을 알아야 하는 코드는 정규식이 아니라 렌더러와 같은 트리를 읽음
- resolve되지 않은 wiki link도 숨기지 않음. vault에서는 정상 상태임
- 본문 heading은 페이지 제목 아래 단계로 한 단계씩 낮춤
- `~` 하나는 취소선이 아님. 한국어 범위 표기가 취소선이 되지 않게 함
