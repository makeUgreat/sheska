---
title: 디자인 토큰
applies_to:
  - apps/ui
related:
  - ./design.md
  - ./responsive.md
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
- **Accent-Hover**: `accent-strong`과 같은 값의 alias다. 본문 inline link의 hover ink로 사용한다.
- **On-Surface-Muted**: `#7e828c` (`on-surface-muted`). Dark elevated surface 위 low-emphasis ink다 (`surface` 위 4.83:1).
  Code fence의 주석과 chrome이 쓴다. Light page의 `text-muted`는 `surface` 위에서 1.4:1이므로 서로 대체하지 않는다.
- **Border**: `#564242` (`outline-variant`). Subtle structural separation을 위한 cool, low-contrast border다.

모든 green, blue, yellow tone은 피한다. Success state는 green으로 색을 바꾸기보다 typography나 iconography로 전달한다.

## 타이포그래피

이 디자인 시스템은 technical nature를 강조하기 위해 dual-font approach를 사용한다. **Geist**는 모든 UI와 prose의 clean, modern Sans-Serif foundation으로 사용하고, **JetBrains Mono**는 labels, tags, data points에 사용해 terminal-inspired precision을 만든다.

Headline은 minimal background 위에서 강한 visual hierarchy를 만들 수 있도록 tight tracking과 bold weight를 사용한다. Body text는 넉넉한 line height로 가독성을 우선한다. Label은 항상 monospace로 설정하며, "metadata" 느낌을 위해 자주 대문자로 사용한다.

`label-sm`의 넓은 tracking(`0.1em`)은 대문자 label을 전제로 한 값이다. 대문자는 글자 폭이 고르고 단어 경계가 약해서 자간이 그 역할을 대신한다.
같은 크기를 대문자가 아닌 문구에 쓸 때는 tracking을 `normal`로 되돌린다. Article outline의 제목 링크가 여기에 해당한다.
자간은 단어 경계를 만들어주지 못하면서 폭만 먹고, 폭이 좁고 한 줄로 잘리는 자리에서는 그만큼 글자가 덜 보인다.
같은 320px 목차에서 한글 26자가 29자, 영문 33자가 38자가 된다.

## 레이아웃과 간격

Layout philosophy는 desktop에서는 **Fixed Grid**, mobile에서는 **Fluid Grid** model을 따른다.

- **Desktop**: 최대 container width 1280px의 12-column grid. Gutter는 content block을 명확히 분리하기 위해 24px로 고정한다.
- **Mobile**: 16px side margin을 가진 4-column fluid grid.
- **Spacing Rhythm**: 모든 margin과 padding은 4px base unit의 배수여야 한다.
- **Reading Measure**: Prose를 읽는 컬럼은 `--spacing-measure`(680px)를 넘지 않는다. Note 본문과 post 본문이 이 값을 공유하므로, 한쪽만 바꾸면 두 화면의 줄 길이가 어긋난다. 이 상한을 어떻게 거는지는 [반응형 레이아웃](./responsive.md)을 따른다.
- **Outline Width**: Article outline은 본문 옆에 남는 여백을 `--spacing-toc-min`(200px)과 `--spacing-toc-max`(320px) 사이에서 폭으로 쓴다. 하한은 `--breakpoint-toc`(1200px)를 유도한 값이므로 둘은 함께 움직인다. 상한은 목차가 두 번째 읽기 컬럼처럼 보이지 않게 막는다.

Major section 사이에는 minimalist, editorial aesthetic을 강조하기 위해 64px 이상의 넓은 margin을 사용한다. Content는 붐비지 않고 의도적으로 배치된 느낌이어야 한다.

## Elevation & Depth

Depth의 주된 수단은 **Tonal Layers**와 **Low-Contrast Outlines**다.

이 tonal-layer model은 light page base가 아니라 dark하고 terminal-styled elevated component 내부에 적용된다: 사용자에게 가까운 object일수록 더 밝은 tone을 가지며, 가장 어두운 surface (`surface-container-lowest`)가 `surface-container-high` 같은 더 elevated한 tone 뒤에 놓인다.

Boundary를 정의할 때는 `#564242` (`outline-variant`)의 1px solid border를 사용한다. Active 또는 focused element는 border나 text color를 primary Rose Red (`#e16d76`)로 바꿔 "glow-less" highlight를 만든다.

Light page background 위에서 두 영역을 갈라야 하는데 block 전체를 칠하면 과한 경우에는 가로로 옅어지는 1px rule을 쓴다. Note와 post 상세에서 article header와 본문 사이가 여기 해당하며, `@/shared/ui`의 `ArticleLayout`이 소유한다. 글줄이 시작하는 쪽은 `outline-variant` 26%로 또렷하고 끝나는 쪽은 투명으로 사라지므로, 같은 페이지의 다른 선과 혼동되지 않는다. Markdown의 `---`는 가운데 짧은 선이고 footer rule은 폭을 꽉 채우는 균일한 선이다.

이 rule은 light page 위에서 영역을 가르는 수단이므로 dark elevated surface의 tonal layer로 대체하지 않는다. Elevated dark surface가 필요한 자리인지, 같은 page 평면에서 경계만 그으면 되는 자리인지로 둘을 구분한다.

## 코드 펜스

Markdown code fence는 highlight.js를 거쳐 token마다 class를 얻고, `src/styles/code-highlight.css`가 그 class에 ink를 건다.
Fence 전체는 `@/shared/ui`의 `CodeBlock`이 소유한다.

- Token ink는 색상이 아니라 `surface` 위 밝기 네 단계로 역할을 나눈다.
  - Palette가 monochrome-first이고 green, blue, yellow를 쓰지 않으므로 다색 syntax theme을 그대로 들여올 수 없다.
  - 밝기로 나누면 색을 구분하지 못하는 조건에서도 같은 층위가 남는다.

| 역할 | Token | `surface` 대비 |
| --- | --- | --- |
| 식별자, 함수 이름, 연산자 (기본 ink) | `on-surface` | 14.4:1 |
| 문자열, 숫자, 속성 이름 | `primary` | 11.0:1 |
| Keyword, 타입, built-in, tag | `accent` | 5.9:1 |
| 주석 (italic) | `on-surface-muted` | 4.8:1 |

- Token 구분이 더 필요하면 색을 새로 들이지 말고 밝기 단계, italic, weight로 나눈다.
- Fence에는 언어 표기와 복사 버튼을 얹은 한 줄 chrome을 함께 둔다.
  - Highlighting만으로는 본문 사이에서 코드 블록임이 충분히 드러나지 않는다.
- 복사 결과는 아이콘 교체와 `role="status"`로 알린다.
  - 클립보드 복사는 화면에 결과를 남기지 않고, `navigator.clipboard`가 없는 컨텍스트에서는 실제로 실패한다.
    표시가 없으면 성공과 실패가 같아 보인다.
  - 이모지는 쓰지 않는다. 글리프에 색이 박혀 있어 `currentColor`를 따르지 않고, 성공 표시 이모지는 green이다.
- Fence 본문은 `code-block`, 본문 사이의 inline code는 `code-snippet`을 쓴다.
  - 크기는 같고 line height만 다르다. Fence는 줄 단위로 읽고 inline code는 본문 한 줄에 얹힌다.

## Effects & Motion

Hover와 motion interaction은 generated token을 거치지 않고 Tailwind utility class를 그대로 사용한다. 예:

- **Card hover**: `@/shared/ui`의 `CardLink`가 소유한다. 200ms `ease-out`으로 1px lift, `accent` 5% tint, `--shadow-card-hover`, 제목 ink의 `accent-strong` 전환을 함께 건다. `prefers-reduced-motion`에서는 transition과 lift를 끈다.
- **Action link hover**: 화살표에만 `translate-x-1`.
- **Text link hover**: accent color로의 단순 color transition.
- **Article outline 펼침**: `--breakpoint-toc`(1200px) 이상에서는 제목이 보이는 상태로 고정한다. 그 아래에서는 섹션당 선 하나짜리 눈금으로 접고 hover 또는 `focus-within`에 200ms `ease-out` opacity로 펼친다. 접힌 눈금은 `aria-hidden`이고 제목 링크는 항상 DOM에 남으므로, 보조기술에는 시각 상태와 무관하게 전체 목차가 읽힌다. Hover가 없는 기기(`@media (hover: none)`)에서는 펼치는 수단이 없으므로 펼친 상태로 둔다. 펼친 목차가 본문을 덮는 구간에서는 `--shadow-floating-panel`로 layer임을 드러내고, 여백에 여유가 생기는 `--breakpoint-toc` 이상에서는 그림자를 끈다. 목차의 폭과 가로 위치 계산은 [반응형 레이아웃](./responsive.md)에 있다. `prefers-reduced-motion`에서는 transition과 `scroll-behavior: smooth`를 모두 끈다.
- **Article outline 한 줄**: 목차는 문서 구조를 한눈에 보여주는 것이 목적이므로 항목마다 한 줄만 쓴다. 폭은 본문 옆 여백을 따라 넓어지고, 그래도 넘치는 제목은 줄을 늘리지 않고 끝을 자른다. 목차가 담는 것은 제목 전문이 아니라 섹션의 개수와 깊이다. 잘린 제목의 전문은 `title`에 남는다. 제목 링크는 대문자가 아니므로 `label-sm`의 tracking을 `normal`로 되돌린다. `ON THIS PAGE` label은 대문자이므로 그대로 둔다.
- **Article outline 적중 범위**: 목차 상자 전체는 pointer에 투명하다(`pointer-events: none`). 상자가 목차 폭만큼 넓어서, 접힌 구간에서 본문 위를 덮는 부분이 본문 선택을 가로막지 않아야 한다. Pointer를 받는 것은 펼치는 눈금과 펼쳐진 목차뿐이다.

Note, post, source card는 모두 `CardLink` 위에 놓인다. Card처럼 전체가 클릭되는 새 surface를 만들 때는 hover recipe를 다시 선언하지 말고 `CardLink`를 쓴다. Card hover 자체를 바꾸려면 `card-link.tsx` 한 곳만 고친다.

Effect variable은 `design-tokens.json`이 아니라 `src/index.css`의 `@theme` block에 둔다. Generated token file은 color, typography, radius, spacing만 담는다. Effect는 지금 `CardLink`와 article outline이 쓰는 값이라 cross-platform token exchange 대상이 아니고, generator에 새 token group을 여는 대신 실제 사용처 옆에 둔다. Effect가 여러 primitive로 퍼지면 그때 `design-tokens.json`으로 승격한다.

새 effect나 motion 값을 추가하기 전에는 실제로 그 값을 쓰는 구현 지점을 확인한다. 추측이나 브랜드에 "어울릴 것 같은" 값으로 값을 만들지 않는다. 구현의 특정 줄을 가리킬 수 없는 값은 추가하지 않는다.

## 형태

Shape language는 절제되고 professional하다. Button과 input field 같은 작은 component에는 **Soft** roundedness (0.25rem/4px)를 사용한다. 이는 grid 기반의 rectangular layout precision을 해치지 않으면서 약간의 친근함을 더한다. Card 같은 큰 container는 background와 더 구분되도록 `rounded-lg` (8px) token을 사용할 수 있다.
