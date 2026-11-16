---
title: UI 디자인 컨벤션
applies_to:
  - apps/ui
read_when:
  - 색, 글꼴, 간격, 컴포넌트 모양, 효과를 바꿀 때
  - breakpoint, 화면 폭에 따른 배치, 본문 폭, overflow 처리를 바꿀 때
related:
  - ./structure.md
---

# UI 디자인 컨벤션

## 기준
- 이 문서와 `src/styles/design-tokens.json`이 시각 방향의 기준임. 외부 디자인 도구를 기준으로 삼지 않음
- 구현이 이 문서와 다르면 구현을 고치거나, 의도한 변경이면 같은 변경에서 이 문서를 고침
- token 값은 `design-tokens.json`에만 둠. `src/styles/theme.css`는 생성 파일이고 `tokens:check`가 동기화를 검사함
- `design-tokens.json`에는 구현이 실제로 쓰는 token만 둠
  - 쓰이지 않는 token은 어떤 값이 화면을 정하는지 가리고, 잘못 alias해도 아무도 모름

## 톤
- monochrome-first palette에 accent 색 하나(rose red)만 씀. green, blue, yellow는 쓰지 않음
  - 성공 같은 상태는 색이 아니라 글자나 아이콘으로 나타냄
- 페이지는 밝은 배경에 거의 검은 글자를 씀. 어두운 terminal 톤은 header, landing의 terminal window, code fence에만 씀

## 화면 구성
- header와 landing의 terminal window만 장식을 맡음. 나머지 화면은 글자와 선만으로 짬
  - card, thumbnail, 칠한 badge를 두지 않음. 장식이 한 곳에 모여야 terminal이 앱의 정체성으로 읽힘
- post 목록은 reading measure 한 칸에 제목과 날짜만 한 줄씩 놓고 작성 연도마다 묶음
  - 목록은 훑으라고 있으므로 긴 제목은 줄을 바꾸지 않고 자름
  - 제목과 날짜를 한 줄에 두는 목록은 `ArchiveIndex`를 씀. hover 동작을 다시 선언하지 않음
- `lg:` 이상에서는 목록 옆에 미리보기 칸을 둠
  - 미리보기는 목록의 항목을 다시 보여줄 뿐이라 보조기술에서는 숨기고, 좁은 화면에서는 두지 않음
  - 미리보기는 목록 응답에 있는 값만 씀. post 상세 API는 부를 때마다 조회수를 올림
- 상세 화면의 제목은 `headline-md`로 둠. 본문이 화면의 주인공이라 header가 본문보다 크게 보이지 않게 함
- 여러 상태는 색을 늘리지 않고 모양으로 가름. 예: source 동기화 상태는 `●` 완료, `○` 대기, `■` 실패이고 실패만 `accent-strong`으로 칠함

## 색 사용
- `accent`는 밝은 배경에서 대비가 3.16:1임. 밝은 배경에서는 24px 이상 글자, border, focus ring에만 씀. 어두운 surface에서는 제한 없음
- 밝은 배경의 작은 글자와 흰 글자를 얹는 fill에는 `accent-strong`(6.46:1)을 씀
- 낮은 강조 글자는 밝은 배경에서 `text-muted`, 어두운 surface에서 `on-surface-muted`를 씀. 서로 대체하지 않음. `text-muted`는 `surface` 위에서 1.4:1임

## 글꼴
- UI와 본문은 Geist, label과 tag와 데이터는 JetBrains Mono를 씀
- 본문 heading `h4` 이하는 크기 token을 새로 들이지 않고 weight와 ink로 나눔. `h6`은 label처럼 monospace 대문자로 둠
- `label-sm`의 넓은 tracking(`0.1em`)은 대문자 label 전용임. 대문자가 아닌 문구에 쓸 때는 `normal`로 되돌림
  - 자간은 단어 경계를 만들지 못하고 폭만 먹음. 예: 같은 320px 목차에서 한글이 26자에서 29자로 늘어남

## 간격과 폭
- margin과 padding은 4px의 배수임
- 본문을 읽는 컬럼은 `--spacing-measure`(680px)를 넘지 않음
- 목록 옆 미리보기 칸(`--spacing-peek`, 320px)은 목록보다 좁음. 넓으면 두 번째 읽기 컬럼처럼 보임
- 목차 폭은 본문 옆 여백을 `--spacing-toc-min`과 `--spacing-toc-max` 사이에서 씀. 하한은 `--breakpoint-toc`를 유도하는 값이라 둘은 함께 움직임
- 밝은 배경에서 두 영역을 가를 때는 칠하지 않고 한쪽 끝이 투명해지는 1px rule을 씀. 예: post 상세의 header와 본문 사이

## 코드 펜스
- token ink는 색이 아니라 `surface` 위의 밝기 네 단계로 역할을 나눔
  - palette에 green, blue, yellow가 없어서 다색 syntax theme을 쓸 수 없음. 밝기로 나누면 색을 구분하지 못하는 조건에서도 층위가 남음
  - 구분이 더 필요하면 색을 들이지 않고 밝기, italic, weight로 나눔
- fence에는 언어 표기와 복사 버튼을 얹은 한 줄 chrome을 둠. highlighting만으로는 코드 블록임이 충분히 드러나지 않음
- 복사 결과는 아이콘 교체와 `role="status"`로 알림
  - 클립보드 복사는 화면에 결과를 남기지 않고, `navigator.clipboard`가 없는 곳에서는 실제로 실패함
  - 이모지는 쓰지 않음. 색이 박혀 있어 `currentColor`를 따르지 않음

## 효과
- hover와 motion은 token이 아니라 Tailwind utility로 씀. `prefers-reduced-motion`에서는 transition과 smooth scroll을 끔
- effect 값(shadow 등)은 `design-tokens.json`이 아니라 쓰는 곳 옆(`src/index.css`의 `@theme`)에 둠. 여러 primitive로 퍼지면 그때 token으로 올림
- 효과, motion, breakpoint 값은 쓰는 구현 지점을 가리킬 수 있을 때만 더함. 어울릴 것 같다는 이유로 만들지 않음
- 작은 컴포넌트는 4px, code block과 panel 같은 큰 container는 `rounded-lg`(8px) 모서리를 씀

## 목차
- 목차는 `--breakpoint-toc`(1200px) 이상에서만 보이고 항상 펼쳐 둠
  - 그 아래에서는 본문 옆 여백이 목차 하한보다 좁아 목차가 본문을 덮음
  - 좁은 폭용으로 접힌 눈금과 hover 펼침을 두었다가 뺐음. pointer 처리, 펼침 상태, hover 없는 기기 예외가 따라붙었고 터치 기기에서 펼친 목차가 본문을 덮었음
- 목차 항목은 한 줄만 씀. 넘치는 제목은 자르고 전문은 `title`에 남김
  - 목차가 보여 줄 것은 제목 전문이 아니라 섹션의 개수와 깊이임

## 반응형
- 기본 스타일은 가장 좁은 화면 기준으로 쓰고, 넓어질 때 필요한 것만 `min-width` breakpoint로 더함. `max-width`로 되돌리지 않음
  - 되돌리는 규칙은 원래 규칙과 짝으로만 이해되어, 한쪽을 지울 때 다른 쪽이 남음
- 지원 하한은 320px임
- 크기 문제는 breakpoint보다 상한선 하나(`mx-auto max-w-measure`)로 먼저 풂
- 상한선을 breakpoint 안에 넣지 않음. 상한은 화면 크기와 무관하게 항상 참이어야 함
  - 본문 폭 상한이 `lg:` 안에 있어서 900px 화면에서 한 줄이 991px까지 늘어난 적이 있음
- 두 기준 중 하나를 고르는 위치 계산은 breakpoint 대신 `min()`, `max()`, `clamp()`로 씀. 예: 목차의 `toc-beside-article`
  - 전환점을 사람이 계산해 적지 않아서 본문 폭을 바꿔도 전환점이 따라옴
  - `fixed` 요소는 `vw`가 아니라 `%`를 씀. `vw`는 scrollbar 폭만큼 어긋남
- breakpoint는 값이 아니라 형태가 바뀌는 곳에만 씀. 예: 컬럼 수, 요소의 등장, 배치 축

| 접두사 | 폭 | 형태 변화 |
|---|---|---|
| `sm:` | 640px~ | 쌓인 block을 나란히 놓음, header의 terminal 신호등 등장 |
| `md:` | 768px~ | landing hero 글자 확대 |
| `lg:` | 1024px~ | source 상세 사이드 패널, 목록 옆 미리보기 등장 |
| `toc:` | 1200px~ | 목차 등장 |

- 구간을 모바일, 태블릿, 데스크톱 같은 기기 이름으로 부르지 않음. 예: iPad Pro 가로는 1024px이고, 눕힌 휴대폰은 844px임
- `toc`의 1200px은 `measure + 2 × (toc-min + 2 × gutter)` = 1176px에 scrollbar 자리를 더해 올린 값임. measure, toc-min, gutter를 바꾸면 다시 계산함
- 실행 중에 이어 붙인 class(`` `${VARIANT}:hidden` ``)는 Tailwind가 생성하지 못함. 반복되는 조건은 이름 있는 variant로 만듦
- container query는 지금 쓰지 않음. 재사용 컴포넌트를 폭이 다른 두 번째 자리에 놓을 때 그 컴포넌트의 breakpoint를 옮김

## Overflow
- 페이지 자체에는 가로 스크롤이 생기지 않아야 함
- 폭을 줄일 수 없는 콘텐츠(code block, 표)는 자기 스크롤 컨테이너에 가둠
- 본문의 긴 단어는 `break-words`로 접고, 훑어보는 목록은 줄을 늘리지 않고 `truncate`와 `title`로 자름
- 긴 값이 들어가는 flex, grid 항목에는 `min-w-0`을 함께 줌. `break-words`는 항목의 `min-content`를 줄이지 않음
- `break-all`은 ID, fingerprint처럼 어디서 끊겨도 되는 값에만 씀
- 음수 margin으로 번지는 표면은 페이지 좌우 여백(16px)보다 넓게 번지지 않음
