---
title: 디자인 컴포넌트
lang: ko
audience: both
applies_to:
  - apps/ui
source: ../en/design-component.md
related:
  - ./design.md
  - ./design-token.md
---

# 디자인 컴포넌트

## 버튼

- **Primary**: Solid Rose Red (`#e06c75`) background와 White text를 사용한다. Border는 없다.
- **Secondary**: Ghost style이다. Transparent background에 1px Rose Red border와 Rose Red text를 사용한다.
- **Tertiary**: Transparent background와 white text를 사용하고 border는 없다. Hover 시 subtle underline을 사용한다.

## Chips & Tags

항상 **JetBrains Mono**로 렌더링한다. High-visibility tag에는 dark charcoal background (`#282c34`)와 Rose Red text를 사용하고, standard metadata에는 muted gray text를 사용한다.

## Input Fields

Dark background (`#121418`)와 1px gray border (`#3e4451`)를 사용한다. Focus 시 border는 Rose Red로 바뀐다. Input text에는 technical theme를 강화하기 위해 monospaced font를 사용한다.

## Lists

1px charcoal line의 clean horizontal divider를 사용한다. Active list item은 full background highlight 대신 왼쪽의 2px vertical Rose Red "marker"로 표시한다.

## Cards

Card는 `#282c34` surface color를 사용한다. Shadow는 사용하지 않는다. `#1a1d23` background와의 contrast, 그리고 featured content를 위한 subtle top-border Rose Red highlight로 구분한다.

## Checkboxes & Radio Buttons

Custom-styled square와 circle을 사용한다. Checked state에서는 Rose Red로 채우고 white checkmark/dot을 표시한다. Unchecked state는 단순한 charcoal border를 사용한다.
