---
title: 디자인 시스템
applies_to:
  - apps/ui
related:
  - ./design-token.md
read_when: visual design, CSS structure, design token, typography, color, spacing, component styling을 변경하거나 검토할 때
---

# 디자인 시스템

## 출처

이 문서와 [디자인 토큰](./design-token.md)이 `apps/ui` 시각 방향의 source of truth다.
외부 design tool을 authoritative reference로 삼지 않는다.

개별 시각 detail을 맥락 없이 복사하지 말고 아래 기술한 의도된 톤을 보존한다.
구현이 이 문서와 어긋나면 구현을 맞추거나, 의도한 변경이라면 같은 변경 단위에서 이 문서를 갱신한다.

## 브랜드와 스타일

Brand identity는 엄격한 minimalism과 따뜻한 editorial edge 사이의 균형을 잡는 고정밀 technical aesthetic을 중심으로 한다. 대상 독자는 functional clarity와 deep focus를 중시하는 developers, architects, researchers다.

Design style은 terminal environment와 high-end print design에서 영감을 받은 **Minimalist with a Technical Edge**다. 넓은 whitespace, 의도적인 high contrast, 하나의 accent color를 사용해 cognitive noise 없이 시선을 유도한다. 감성적 인상은 calm authority, precision, intellectual rigor다. 절제된 monochrome-first palette를 유지하기 위해 모든 green tone은 엄격히 제외한다.

페이지는 near-black text가 있는 light하고 editorial한 page background 위에 놓이고, dark하고 terminal-styled한 charcoal tone은 base page가 아니라 특정 elevated component(header, hero terminal window, code fence)에만 한정해서 사용한다. 정확한 구분은 [디자인 토큰](./design-token.md)의 색상 항목을 참고한다.

## 화면 구성

- Header와 landing의 terminal window가 이 앱의 장식을 맡는다. 나머지 화면은 글자와 선만으로 짠다.
  - Card, thumbnail, 칠한 badge를 두지 않는다.
  - 장식이 한 곳에 모여 있어야 header의 terminal이 이 앱의 정체성으로 읽힌다.
- Post와 note 목록은 reading measure 한 칸에 제목과 날짜만 한 줄씩 놓고, 작성 연도마다 묶는다.
  - 목록은 훑으라고 있으므로 긴 제목은 줄을 바꾸지 않고 자른다.
  - 검색 결과처럼 API가 snippet을 주면 제목 아래에 붙인다.
  - `@/shared/ui`의 `ArchiveIndex`가 이 목록을 소유한다.
- `lg:` 이상에서는 목록 옆에 미리보기 칸을 둔다.
  - 미리보기는 pointer나 focus가 머문 항목을 보여주고, 아무것도 고르지 않았으면 첫 항목을 보여준다.
  - 미리보기는 목록에 이미 있는 항목을 다시 보여줄 뿐이므로 보조기술에서는 숨기고, 좁은 화면에서는 두지 않는다.
  - `@/shared/ui`의 `PeekLayout`이 목록과 미리보기 칸의 배치를 소유한다.
- Note 미리보기는 note 본문을 불러와 첫 문단을 보여준다.
  - 목록을 훑는 동안 지나가는 항목마다 요청하지 않도록, 잠시 머문 항목만 불러온다.
- Post 미리보기는 목록 응답에 있는 값만 쓴다.
  - Post 상세 API는 호출할 때마다 조회수를 올린다.
    미리보기를 위해 부르면 읽지 않은 글의 조회수가 오른다.
- 상세 화면의 제목은 `headline-md`로 두고, 날짜와 키워드는 그 아래 한 줄에 muted ink로 둔다.
  - 본문이 화면의 주인공이므로 header가 본문보다 크게 보이지 않게 한다.
- 여러 상태를 가를 때는 색을 늘리지 않고 모양으로 가른다.
  - Source 동기화 상태는 `●` 완료, `○` 대기, `■` 실패로 표시한다.
  - 실패만 `accent-strong`으로 칠해 먼저 눈에 띄게 한다.

## 디자인 토큰

[디자인 토큰](./design-token.md)을 참고한다.
