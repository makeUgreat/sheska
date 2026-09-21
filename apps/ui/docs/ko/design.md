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

이 앱은 dark-mode UI가 아니다. 페이지는 near-black text가 있는 light하고 editorial한 page background 위에 놓이고, dark하고 terminal-styled한 charcoal tone은 base page가 아니라 특정 elevated component(hero terminal window, card, tag)에만 한정해서 사용한다. 정확한 구분은 [디자인 토큰](./design-token.md)의 색상 항목을 참고한다.

## 디자인 토큰

[디자인 토큰](./design-token.md)을 참고한다.
