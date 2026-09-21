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

`design-tokens.json`은 구현이 실제로 참조하는 token만 담는다. 나중에 쓸지도 모른다는 이유로 palette 전체를 옮겨두지 않는다. 쓰이지 않는 token은 어떤 값이 실제 화면을 결정하는지 가리고, 잘못된 값으로 alias해도 아무도 알아채지 못하게 만든다.

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
- **Surface family**: `#0b0e14`~`#32353b` (`surface`, `surface-container-lowest`, `surface-container-low`, `surface-container-high`, `surface-variant`). Page background가 아니라 hero terminal window, card, tag 같은 dark하고 terminal-styled elevated component 전용 deep charcoal tone이다.
- **Accent**: `#e16d76` (`accent`). Light page background 위에서 3.16:1이므로 large text(24px 이상), border, focus ring 같은 non-text contrast에만 쓴다. Dark elevated surface 위에서는 제한 없이 쓴다.
- **Accent-Strong**: `#a13c46` (`accent-strong`). Light page background 위 small text와, white text를 얹는 fill에 쓴다. 두 경우 모두 6.46:1이다.
- **Accent-Hover**: `accent-strong`과 같은 값의 alias다. Wordmark와 footer link의 hover ink로 사용한다.
- **Border**: `#564242` (`outline-variant`). Subtle structural separation을 위한 cool, low-contrast border다.

모든 green, blue, yellow tone은 피한다. Success state는 green으로 색을 바꾸기보다 typography나 iconography로 전달한다.

## 타이포그래피

이 디자인 시스템은 technical nature를 강조하기 위해 dual-font approach를 사용한다. **Geist**는 모든 UI와 prose의 clean, modern Sans-Serif foundation으로 사용하고, **JetBrains Mono**는 labels, tags, data points에 사용해 terminal-inspired precision을 만든다.

Headline은 minimal background 위에서 강한 visual hierarchy를 만들 수 있도록 tight tracking과 bold weight를 사용한다. Body text는 넉넉한 line height로 가독성을 우선한다. Label은 항상 monospace로 설정하며, "metadata" 느낌을 위해 자주 대문자로 사용한다.

## 레이아웃과 간격

Layout philosophy는 desktop에서는 **Fixed Grid**, mobile에서는 **Fluid Grid** model을 따른다.

- **Desktop**: 최대 container width 1280px의 12-column grid. Gutter는 content block을 명확히 분리하기 위해 24px로 고정한다.
- **Mobile**: 16px side margin을 가진 4-column fluid grid.
- **Spacing Rhythm**: 모든 margin과 padding은 4px base unit의 배수여야 한다.
- **Reading Measure**: Prose를 읽는 컬럼은 `--spacing-measure`(680px)를 넘지 않는다. Note 본문과 post 본문이 이 값을 공유하므로, 한쪽만 바꾸면 두 화면의 줄 길이가 어긋난다.

Major section 사이에는 minimalist, editorial aesthetic을 강조하기 위해 64px 이상의 넓은 margin을 사용한다. Content는 붐비지 않고 의도적으로 배치된 느낌이어야 한다.

## Elevation & Depth

Depth의 주된 수단은 **Tonal Layers**와 **Low-Contrast Outlines**다.

이 tonal-layer model은 light page base가 아니라 dark하고 terminal-styled elevated component 내부에 적용된다: 사용자에게 가까운 object일수록 더 밝은 tone을 가지며, 가장 어두운 surface (`surface-container-lowest`)가 `surface-container-high` 같은 더 elevated한 tone 뒤에 놓인다.

Boundary를 정의할 때는 `#564242` (`outline-variant`)의 1px solid border를 사용한다. Active 또는 focused element는 border나 text color를 primary Rose Red (`#e16d76`)로 바꿔 "glow-less" highlight를 만든다.

## Effects & Motion

Hover와 motion interaction은 generated token을 거치지 않고 Tailwind utility class를 그대로 사용한다. 예:

- **Card hover**: `@/shared/ui`의 `CardLink`가 소유한다. 200ms `ease-out`으로 1px lift, `accent` 5% tint, `--shadow-card-hover`, 제목 ink의 `accent-strong` 전환을 함께 건다. `prefers-reduced-motion`에서는 transition과 lift를 끈다.
- **Action link hover**: 화살표에만 `translate-x-1`.
- **Text link hover**: accent color로의 단순 color transition.

Note, post, source card는 모두 `CardLink` 위에 놓인다. Card처럼 전체가 클릭되는 새 surface를 만들 때는 hover recipe를 다시 선언하지 말고 `CardLink`를 쓴다. Card hover 자체를 바꾸려면 `card-link.tsx` 한 곳만 고친다.

Effect variable은 `design-tokens.json`이 아니라 `src/index.css`의 `@theme` block에 둔다. Generated token file은 color, typography, radius, spacing만 담는다. Effect는 지금 `CardLink` 하나가 쓰는 값이라 cross-platform token exchange 대상이 아니고, generator에 새 token group을 여는 대신 실제 사용처 옆에 둔다. Effect가 여러 primitive로 퍼지면 그때 `design-tokens.json`으로 승격한다.

새 effect나 motion 값을 추가하기 전에는 실제로 그 값을 쓰는 구현 지점을 확인한다. 추측이나 브랜드에 "어울릴 것 같은" 값으로 값을 만들지 않는다. 구현의 특정 줄을 가리킬 수 없는 값은 추가하지 않는다.

## 형태

Shape language는 절제되고 professional하다. Button과 input field 같은 작은 component에는 **Soft** roundedness (0.25rem/4px)를 사용한다. 이는 grid 기반의 rectangular layout precision을 해치지 않으면서 약간의 친근함을 더한다. Card 같은 큰 container는 background와 더 구분되도록 `rounded-lg` (8px) token을 사용할 수 있다.
