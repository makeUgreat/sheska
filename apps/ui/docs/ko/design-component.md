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

## 기준 소스

Posts 화면과 Stitch `Main Blog Page (Ember & Ash Theme)`를 v1 컴포넌트
추출의 canonical design source로 삼는다.
`Source*` 화면은 임시 product UI이므로 의도적인 디자인 정리 전까지 shared
component API 설계 기준으로 사용하지 않는다.

v1 컴포넌트는 범용 UI kit가 아니다. Posts 읽기 경험 안에서 반복되거나 Stitch
blog design을 직접 지원하는 안정적인 React pattern만 분리한다.

Shared component는 token-backed Tailwind class를 사용한다. Page-level raw hex
color는 점진 제거 대상이며, 새 shared component에는 추가하지 않는다.
`className`은 margin, width, grid placement 같은 layout 보정에는 허용하지만
component의 color, typography, border, visual identity를 override하는 용도로는
사용하지 않는다.

## Typography 역할

- Headline과 body UI는 `font-sans`를 통해 Geist를 사용한다.
- Terminal text, metadata, tag, code-like label, action affordance는
  `font-mono`를 통해 JetBrains Mono를 사용한다.

## Accessibility

- Action link는 명확한 text label을 가져야 하며 visible arrow affordance를
  추가할 수 있다.
- Loading, empty, error state는 text를 포함해야 하고 color에만 의존하면 안 된다.
- 주변 UI를 component화하더라도 기존 `SyncJobProgress`의 `progressbar` ARIA 같은
  progress semantic은 유지한다.

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

## UI Primitives

### `Tag`

Compact JetBrains Mono label을 렌더링한다.

Props:

- `tone`: high-visibility label에는 `accent`, 조용한 metadata에는 `muted`를 사용한다.
- `className`: layout 보정에만 사용한다.

Example:

```tsx
<Tag tone="accent">#POST</Tag>
```

### `ActionLink`

Mono uppercase text와 visible arrow affordance를 가진 internal router link를
렌더링한다. `Read Note`, `Back to posts` 같은 post navigation action에 사용한다.

Props:

- 모든 `react-router-dom` `Link` props.
- `className`: layout 보정에만 사용한다.

Example:

```tsx
<ActionLink to="/posts/post-1">Read Note</ActionLink>
```

### `LoadingDots`

Infinite/loading state의 animated dot indicator를 렌더링한다. 반드시 visible
status text와 함께 사용한다.

Example:

```tsx
<LoadingDots />
```

### `StatusMessage`

Loading, empty, error message를 tokenized state styling으로 렌더링한다. Error
message는 `role="alert"`를 사용한다.

Props:

- `tone`: `loading`, `empty`, `error`.
- `className`: layout 보정에만 사용한다.

Example:

```tsx
<StatusMessage tone="error">Error: API unavailable</StatusMessage>
```

## Post Components

### `TerminalWindow`

Traffic lights, title bar, prompt/body/cursor slot을 가진 posts hero terminal shell을
렌더링한다. Terminal chrome과 typography는 component가 소유하고 caller는 terminal
content를 제공한다.

Example:

```tsx
<TerminalWindow prompt={<div>visitor@garden:~$ init</div>}>
  <div>Ready for input.</div>
</TerminalWindow>
```

### `PostMeta`

Date, view count, tag를 mono metadata row로 렌더링한다.

Props:

- `updatedAt`: ISO timestamp string.
- `viewCount`: numeric post views.
- `tag`: optional label, default `#POST`.

### `PostCard`

Metadata, title, summary, action link, optional thumbnail, search result title
highlight를 가진 post preview를 렌더링한다.

Props:

- `post`: `PostSummary`.
- `highlight`: title 안에서 표시할 optional search query text.
- `thumbnailUrl`: optional image URL.

### `PostSectionHeader`

`Latest Notes & Essays` 같은 posts section에 사용하는 centered-column section
heading pattern을 렌더링한다.
