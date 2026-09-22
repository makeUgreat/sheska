---
title: 반응형 레이아웃
applies_to:
  - apps/ui
related:
  - ./design-token.md
  - ./visual-regression.md
read_when: breakpoint, viewport별 layout, 본문 폭, overflow 처리를 결정하거나 변경하거나 리뷰할 때
---

# 반응형 레이아웃

## 원칙은 Mobile-first다

기본 스타일은 가장 좁은 화면 기준으로 쓰고, 넓어질 때 필요한 것만 breakpoint로 더한다.
Tailwind의 breakpoint 접두사는 전부 `min-width`이므로 접두사 없는 utility가 곧 모바일 스타일이다.

```
px-4 sm:px-6      모든 폭에서 16px, 640px 이상에서만 24px
```

반대 방향(`max-width`로 넓은 화면을 기본 삼고 좁은 화면에서 되돌리기)은 쓰지 않는다.
되돌리는 규칙은 원래 규칙과 짝으로만 이해되기 때문에, 한쪽을 지울 때 다른 쪽을 남기는 실수가 생긴다.

지원 하한은 **320px**다. `src/index.css`의 `body { min-width: 320px }`가 이 하한을 고정한다.

## Breakpoint를 쓰기 전에 상한선으로 되는지 본다

이 문서에서 가장 중요한 규칙이다.

크기 문제는 대부분 breakpoint가 아니라 **상한선 하나**로 끝난다.

```
mx-auto max-w-measure
```

컨테이너가 상한보다 좁으면 알아서 줄고, 넓으면 상한에서 멈춘다. 320px부터 2560px까지 이 한 줄이 처리한다.

**상한선을 breakpoint 안에 넣지 않는다.** 상한은 화면 크기와 무관하게 항상 참이어야 하는 제약이다.
과거에 본문 폭 상한이 `lg:` 안에 있어서 1024px 미만에서는 제한이 사라졌고, 900px 화면에서 한 줄이 991px까지 늘어난 적이 있다.
화면이 커질수록 읽기가 나빠지다가 1024px에서 갑자기 좋아지는 역전이 생겼다.

두 기준 중 하나를 골라야 하는 위치 계산도 breakpoint 없이 `min()` / `max()` / `clamp()`로 쓴다.

```
right: max(var(--spacing-gutter), calc(50% - var(--spacing-measure)/2 - var(--spacing-gutter) - 200px))
```

Note outline의 가로 위치다. 화면이 넓으면 본문 기준, 여백이 부족해지면 화면 기준으로 브라우저가 매 순간 고른다.
전환점을 사람이 계산해서 적지 않으므로 본문 폭을 바꿔도 전환점이 따라온다.
같은 동작을 media query로 쓰면 전환점 숫자가 본문 폭과 따로 놀다가 어긋난다.

따라서 breakpoint는 **값이 변하는 지점이 아니라 형태가 변하는 지점**에만 쓴다.
컬럼 수가 바뀌거나, 요소가 나타나고 사라지거나, 배치 축이 세로에서 가로로 바뀔 때다.

## Breakpoint

| 접두사 | 폭 | 이 앱에서 하는 일 |
| --- | --- | --- |
| 없음 | 320px~ | 기본. 단일 컬럼 |
| `sm:` | 640px~ | 쌓인 block을 나란히 배치 (2열 grid, 가로 flex), header의 terminal 신호등 등장 |
| `md:` | 768px~ | 카드 grid 2열, landing hero 타이포 확대 |
| `lg:` | 1024px~ | Note outline 등장, source 상세 사이드 패널 |
| `toc:` | 1200px~ | Note outline을 펼친 상태로 고정 |
| `xl:` | 1280px~ | 카드 grid 3열 |

`sm` `md` `lg` `xl`은 Tailwind 기본값이다. `toc`는 `src/index.css`의 `@theme`에서 정의한다.

### 기기 이름으로 부르지 않는다

"모바일 / 태블릿 / 데스크톱"으로 구간을 부르지 않는다. 이름과 실제 기기가 어긋나기 때문이다.

- iPad Pro 가로는 1024px이므로 "태블릿" 구간에 들어가지 않는다.
- 휴대폰을 눕히면 844px이 되어 "태블릿" 구간에 들어간다.
- 데스크톱에서 창을 반만 줄이면 700px이 된다.

대신 그 폭에서 **레이아웃이 무엇을 하는지**로 부른다.
새 breakpoint를 추가할 때도 마찬가지다. `--breakpoint-toc`는 "큰 화면"이 아니라 "목차를 펼칠 수 있는 최소 폭"이고,
1200이라는 값은 본문 폭과 목차 자리에서 유도된 숫자다. 이름이 근거를 붙들고 있어야 나중에 임의로 바뀌지 않는다.

### 새 breakpoint를 추가하기 전에

표의 여섯 단계로 표현할 수 없는 형태 변화인지 먼저 확인한다.
실제 사용처를 가리킬 수 없는 breakpoint는 추가하지 않는다. 이 기준은 [디자인 토큰](./design-token.md)의 effect 값 추가 기준과 같다.

## 뷰포트가 아니라 컨테이너를 봐야 할 때가 있다

`sm:` 같은 breakpoint 접두사는 **뷰포트 폭**을 본다. 컴포넌트가 실제로 놓인 자리의 폭은 보지 않는다.
페이지 전폭을 차지하는 레이아웃에서는 둘이 거의 같으므로 문제가 없다.

같은 컴포넌트가 폭이 다른 두 자리에 놓이면 어긋난다.
1440px 화면에서 카드가 본문 컬럼(680px)에 놓이든 사이드 패널(288px)에 놓이든 뷰포트는 1440px 하나이므로, `sm:`은 두 경우를 구분하지 못한다.
좁은 자리에 놓인 카드가 넓은 자리용 가로 배치를 그대로 쓰게 된다.

이때는 container query를 쓴다. 기준을 뷰포트에서 부모 컨테이너로 바꾼다.

```
<section className="@container">              기준이 되는 부모
  <div className="flex flex-col @md:flex-row"> 부모가 448px 이상일 때만 가로 배치
```

`@md:`는 `md:`와 **다른 값이다.** `md:`는 뷰포트 768px, `@md:`는 컨테이너 448px(28rem)이다.
접두사가 비슷해서 같은 단계로 읽히지만 두 척도는 무관하다. 섞어 읽지 않도록 한 컴포넌트 안에서 두 방식을 함께 쓰지 않는다.

### 지금은 쓰지 않는다

현재 breakpoint를 쓰는 컴포넌트는 모두 페이지 전폭 자리 하나에만 놓인다.
Source 상세의 사이드 패널(`PublishPostPanel`)처럼 좁은 자리에 놓이는 컴포넌트는 breakpoint를 쓰지 않는다.
그래서 container query가 고칠 문제가 아직 없고, 쓰이지 않는 수단을 미리 깔아두지 않는다.
이 기준은 [디자인 토큰](./design-token.md)의 "실제 사용처를 가리킬 수 없는 값은 추가하지 않는다"와 같다.

**재사용 컴포넌트를 폭이 다른 두 번째 자리에 놓는 순간** 그 컴포넌트의 breakpoint를 container query로 옮긴다.
그때가 오기 전에 미리 옮기면, 근거 없이 고른 컨테이너 단계가 코드에 남는다.

## 줄어들지 않는 콘텐츠는 지역 스크롤로 가둔다

코드 블록, 표, 긴 URL처럼 폭을 줄일 수 없는 콘텐츠가 있다.
이런 것은 페이지 전체를 가로로 밀어내지 않도록 각자의 스크롤 컨테이너 안에 둔다.

| 대상 | 처리 |
| --- | --- |
| 코드 블록 | `pre`에 `overflow-x-auto` |
| 표 | `overflow-x-auto` wrapper로 감싼다 |
| 긴 URL, 긴 단어 | 본문 컨테이너에 `break-words` |
| 화면보다 긴 목차 | `max-h-[calc(100vh - ...)]` + `overflow-y-auto` |
| 이미지 | Tailwind preflight의 `img { max-width: 100% }`가 처리하므로 추가 작업이 없다 |

**페이지 자체에는 가로 스크롤이 생기지 않아야 한다.** 이것이 반응형 회귀를 판단하는 가장 단순한 기준이다.

### `break-words`는 항목을 줄여주지 않는다

Flex 항목과 grid 항목의 기본 최소 크기는 `min-content`다.
`break-words`(`overflow-wrap: break-word`)는 이미 좁아진 상자 안에서 단어를 끊을 뿐, 항목의 `min-content`를 줄이지 않는다.
그래서 제목이나 frontmatter 값에 긴 토큰 하나만 들어와도 항목이 버티면서 컬럼째로 화면을 밀어낸다.

항목에 `min-w-0`을 함께 준다. 상자가 먼저 줄어들 수 있어야 `break-words`가 동작한다.

```
<div className="min-w-0 flex-1">   제목이 들어가는 flex 항목
<div className="min-w-0">          임의의 값이 들어가는 grid 항목
```

`break-all`은 `min-content` 자체를 줄이므로 ID, fingerprint처럼 어디서 끊겨도 되는 값에만 쓴다.

### 여백으로 번지는 표면은 페이지 여백 안에 머문다

Card hover 표면처럼 음수 margin으로 컨테이너 밖까지 번지는 요소가 있다.
번지는 폭이 페이지 좌우 여백(16px)보다 크면 그 차이만큼 화면 밖으로 나가고, 화면이 좁을수록 그대로 가로 스크롤이 된다.

```
-mx-4 px-4      번지는 폭 16px = 페이지 좌우 여백 16px
```

번지는 폭은 페이지 좌우 여백과 같거나 작게 잡는다. 페이지 여백을 늘려서 맞추지 않는다. 16px는 [디자인 토큰](./design-token.md)이 정한 mobile side margin이다.

## 검증

`jsdom` 테스트는 layout engine을 실행하지 않으므로 폭에 따른 배치를 증명할 수 없다.
반응형 변경은 실제 browser에서 확인한다. 확인할 항목은 다음과 같다.

- 320px부터 사용하는 최대 폭까지 **페이지 가로 스크롤이 0**인지.
- 읽기 컬럼이 어떤 폭에서도 `--spacing-measure`를 넘지 않는지.
- Breakpoint 경계의 양쪽(예: 1199px과 1200px)에서 배치가 의도대로 바뀌는지. 경계 한쪽만 보면 전환 자체를 놓친다.
- 같은 페이지 안에서 정렬선이 맞는지. 본문과 나란히 놓이는 back link, 제목, 구분선이 같은 왼쪽 기준을 공유해야 한다.

가로 스크롤 0은 `test/visual/page-horizontal-scroll.visual.spec.ts`가 320px, 640px, 1280px에서 모든 route를 훑어 자동으로 확인한다.
Fixture는 긴 토큰이 섞인 제목과 값을 쓴다. 짧은 예시 데이터만으로는 항목이 줄어드는지 증명할 수 없기 때문이다.

Screenshot baseline은 [UI Visual Regression 컨벤션](./visual-regression.md)을 따른다.
반응형 변경은 최소한 mobile 폭 하나와 desktop 폭 하나를 덮고, 형태가 바뀌는 breakpoint가 있으면 그 경계를 추가한다.

## 리뷰 체크

- 새로 추가한 breakpoint가 값 변화가 아니라 형태 변화인가.
- 상한선이나 `min()` / `max()` / `clamp()`로 대체할 수 있는 breakpoint인가.
- 상한선이 breakpoint 안에 갇혀 있지 않은가.
- 여러 화면이 공유하는 폭 값이 리터럴로 흩어져 있지 않고 token 하나를 보는가.
- 재사용 컴포넌트의 breakpoint가 뷰포트를 봐야 하는 것이 맞는가, 놓인 자리의 폭을 봐야 하는 것인가.
- 새로 추가한 콘텐츠 중 줄어들지 않는 것이 페이지를 가로로 밀어내지 않는가.
- 긴 토큰이 들어갈 수 있는 flex, grid 항목에 `min-w-0`이 있는가.
