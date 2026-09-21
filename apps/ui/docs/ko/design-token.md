---
title: 디자인 토큰
applies_to:
  - apps/ui
related:
  - ./design.md
---

# 디자인 토큰

Design token value는 DTCG JSON 형식의 `src/styles/design-tokens.json`에 둔다.
이 JSON file이 구현 source of truth다.

`src/styles/theme.css`는 해당 token을 위한 generated Tailwind/CSS adapter다.
앱이 token 기반 utility class를 사용할 수 있도록 token value를 Tailwind v4 `@theme` variable로 노출한다.

`design-tokens.json`을 변경한 뒤에는 `pnpm tokens:build`를 실행한다.
이 명령은 token source에서 `theme.css`를 다시 생성한다.

Token 변경을 리뷰하거나 commit하기 전에는 `pnpm tokens:check`를 실행한다.
이 명령은 `theme.css`가 `design-tokens.json`과 동기화되지 않았을 때 실패한다.
전체 token value 목록은 이 문서에 복사하지 않는다. Token value는 JSON에 두고, 이 문서는 사용 의도를 설명한다.

## 파일 역할

- `src/styles/design-tokens.json`: tool과 cross-platform exchange를 위한 source token data.
- `src/styles/theme.css`: generated app-facing Tailwind v4 `@theme` adapter.
- `docs/ko/design-token.md`: 사람이 읽는 token intent와 usage guidance.

## 색상

Palette는 light하고 editorial한 page base와 dark하고 terminal-styled elevated surface를 함께 사용하며, desaturated rose red를 emphasis와 interactivity를 위한 유일한 수단으로 사용한다.

- **Page Background**: `#ffffff` (`page-background`). Primary app background다. 대부분의 페이지는 이 light base 위에 바로 놓인다.
- **Text-Primary**: `#101319` (`text-primary`). Light page background 위의 near-black text다.
- **Text-Secondary**: `#43474f` (`text-secondary`). Light background 위 metadata와 supportive text를 위한 muted gray다.
- **Text-Muted**: `#6b6f78` (`text-muted`). Light page background 위 low-emphasis label ink다 (5.04:1). Dark theme ink를 alias하지 않는다.
- **Surface family**: `#0b0e14`~`#32353b` (`surface`, `surface-container-lowest`~`surface-container-highest`). Page background가 아니라 hero terminal window, card, tag 같은 dark하고 terminal-styled elevated component 전용 deep charcoal tone이다.
- **Accent**: `#e16d76` (`accent`). Light page background 위에서 3.16:1이므로 large text(24px 이상), border, focus ring 같은 non-text contrast에만 쓴다. Dark elevated surface 위에서는 제한 없이 쓴다.
- **Accent-Strong**: `#a13c46` (`accent-strong`). Light page background 위 small text와, white text를 얹는 fill에 쓴다. 두 경우 모두 6.46:1이다.
- **Accent-Hover**: `accent-strong`과 같은 값의 alias다. Wordmark와 footer link의 hover ink로 사용한다.
- **Border**: `#564242` (`outline-variant` / `border-subtle`). Subtle structural separation을 위한 cool, low-contrast border다.

모든 green, blue, yellow tone은 피한다. Success state는 green으로 색을 바꾸기보다 typography나 iconography로 전달한다.

## 타이포그래피

이 디자인 시스템은 technical nature를 강조하기 위해 dual-font approach를 사용한다. **Geist**는 모든 UI와 prose의 clean, modern Sans-Serif foundation으로 사용하고, **JetBrains Mono**는 labels, tags, data points에 사용해 terminal-inspired precision을 만든다.

Headline은 minimal background 위에서 강한 visual hierarchy를 만들 수 있도록 tight tracking과 bold weight를 사용한다. Body text는 넉넉한 line height로 가독성을 우선한다. Label은 항상 monospace로 설정하며, "metadata" 느낌을 위해 자주 대문자로 사용한다.

## 레이아웃과 간격

Layout philosophy는 desktop에서는 **Fixed Grid**, mobile에서는 **Fluid Grid** model을 따른다.

- **Desktop**: 최대 container width 1280px의 12-column grid. Gutter는 content block을 명확히 분리하기 위해 24px로 고정한다.
- **Mobile**: 16px side margin을 가진 4-column fluid grid.
- **Spacing Rhythm**: 모든 margin과 padding은 4px base unit의 배수여야 한다.

Major section 사이에는 minimalist, editorial aesthetic을 강조하기 위해 64px 이상의 넓은 margin을 사용한다. Content는 붐비지 않고 의도적으로 배치된 느낌이어야 한다.

## Elevation & Depth

Depth는 전통적인 shadow가 아니라 **Tonal Layers**와 **Low-Contrast Outlines**로 전달한다.

이 tonal-layer model은 light page base가 아니라 dark하고 terminal-styled elevated component 내부에 적용된다: 사용자에게 가까운 object일수록 더 밝은 tone을 가지며, 가장 어두운 surface (`surface-container-lowest`)가 `surface-container-high` 같은 더 elevated한 tone 뒤에 놓인다.

Boundary를 정의할 때는 `#564242` (`outline-variant`)의 1px solid border를 사용한다. Flat하고 technical한 외형을 유지하기 위해 drop shadow는 피한다. Active 또는 focused element는 border나 text color를 primary Rose Red (`#e16d76`)로 바꿔 "glow-less" highlight를 만든다.

## Effects & Motion

현재 custom effect/motion token은 없다. Hover와 motion interaction은 token을 거치지 않고 Stitch의 실제 Tailwind utility class를 그대로 사용한다. 예:

- **Garden card hover**: 카드 배경만 `duration-300`으로 tint 변경, border나 shadow 변화 없음.
- **Action link hover**: 화살표에만 `translate-x-1`.
- **Text link hover**: accent color로의 단순 color transition.

새 effect나 motion token을 추가하기 전에는 활성 Stitch project의 exported code에서 정확한 class와 값을 확인한다. 추측, 오래된 export, 또는 브랜드에 "어울릴 것 같은" 값으로 token을 만들지 않는다. 현재 Stitch export의 특정 줄을 가리킬 수 없는 token은 Stitch를 출처로 주장해서는 안 된다.

## 형태

Shape language는 절제되고 professional하다. Button과 input field 같은 작은 component에는 **Soft** roundedness (0.25rem/4px)를 사용한다. 이는 grid 기반의 rectangular layout precision을 해치지 않으면서 약간의 친근함을 더한다. Card 같은 큰 container는 background와 더 구분되도록 `rounded-lg` (8px) token을 사용할 수 있다.
