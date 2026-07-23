---
title: UI 스타일 컨벤션
lang: ko
audience: both
applies_to:
  - apps/ui
source: ../en/ui-style.md
read_when: visual design, CSS structure, design token, typography, color, spacing, component styling을 변경하거나 검토할 때
---

# UI 스타일 컨벤션

## 적용 범위

이 문서는 `apps/ui`의 오래 유지할 시각 방향을 정의한다.
현재 컨벤션은 의도적으로 작게 유지한다. 선택된 디자인 시스템을 보존하되, 제품 UI가 성숙하면서 CSS 결정을 쉽게 바꿀 수 있어야 한다.

## 디자인 시스템

`apps/ui`는 앱에 선택된 활성 Stitch 디자인 시스템을 따른다.
향후 디자인 작업에서 명시적으로 교체하기 전까지 Stitch를 시각 방향의 source of truth로 사용한다.
구현 참조용으로 export된 디자인 시스템 원본은 `apps/ui/DESIGN.md`에 둔다.

현재 활성 Stitch source는 다음과 같다.

- Project: `MacOS Terminal AI Blog`
- Project ID: `18218865311785006442`
- Project URL: `https://stitch.withgoogle.com/projects/18218865311785006442`
- Main page screen: `Main Blog Page (Ember & Ash Theme)`, screen ID `2311ec2a1a4c4a15ae5eedb5b64c0b03`
- Design system screen: `Design System`, screen ID `asset-stub-assets_275de50dde8e4051a9394169751633de`

Stitch project가 변경되면 해당 project와 screen에 대해 사용자가 최신으로 제공한 Stitch Instructions를 authoritative access path로 사용한다.
Reference artifact를 갱신해야 할 때는 Stitch Instructions의 hosted URL을 그대로 사용하고 `curl -L`로 다운로드한다.

Stitch를 구현할 때는 맥락 없이 개별 시각 detail만 복사하지 말고 선택된 디자인 시스템의 의도된 톤을 보존한다.
Stitch 디자인 시스템과 local implementation이 어긋나면 구현을 맞추거나 디자인 시스템 변경을 명시적으로 문서화한다.

## 색상

Palette 결정에는 활성 Stitch 디자인 시스템을 사용한다.
디자인 시스템을 변경하기로 먼저 결정하지 않았다면 무관한 accent나 semantic color 언어를 도입하지 않는다.

색상 선택은 route 전반에서 hierarchy, state, affordance를 일관되게 전달해야 한다.
어떤 색상이 일회성 구현 detail 때문에만 필요하다면, 그 결정은 정책으로 문서화하지 말고 local decision으로 둔다.

## 타이포그래피

Typeface와 type scale 결정에는 활성 Stitch 디자인 시스템을 사용한다.
Typography는 content의 역할을 지원해야 한다. Heading은 hierarchy를 만들고, prose는 읽기 쉬워야 하며, technical metadata는 빠르게 훑을 수 있어야 한다.

디자인 시스템을 의도적으로 확장하는 경우가 아니라면 isolated component를 위해 새 font family나 type scale을 추가하지 않는다.

## 레이아웃과 CSS

활성 Stitch screen은 해당 route의 시각 기준으로 사용한다.
하나의 screen에 있는 현재 layout detail은 같은 pattern이 여러 화면에서 반복되기 전까지 앱 전역 규칙으로 승격하지 않는다.

지역적인 component styling에는 Tailwind utility class를 선호한다.
`src/index.css`는 font import, body default, 앱 전역 browser behavior 같은 global concern에 사용한다.
반복되는 스타일 결정이 실제로 추상화를 필요로 하기 전까지 CSS 구조는 단순하게 유지한다.

## 컴포넌트

Stitch screen이 없는 route라도 component는 활성 디자인 시스템과 호환되어야 한다.
Stitch reference가 없는 route는 기능 구조를 단순하게 유지하고 주변의 이미 확립된 pattern을 재사용한다.

비어 있는 부분을 채우기 위해 지원되지 않는 route에 별도 시각 언어를 만들지 않는다.
새 pattern이 반복될 가능성이 높다면 안정화된 뒤 Stitch에 반영하거나 문서화한다.

## 디자인 검증

UI 변경이 Stitch screen을 구현하는 목적이라면 실제 browser에서 렌더링된 앱을 Stitch reference와 비교한다.
이 비교는 사용자가 인식할 수 있는 design intent에 집중한다. Layout hierarchy, spacing rhythm, typography, color treatment, 주요 state, responsive behavior, content가 겹치지 않고 읽히는지를 확인한다.

Screenshot, generated code, `DESIGN.md` 같은 Stitch export artifact를 구현 참조로 사용한다.
`jsdom` test suite가 통과했다는 사실만으로 visual design이 Stitch와 일치한다고 판단하지 않는다.

좁은 styling 변경은 영향을 받은 route를 browser에서 집중 확인하는 것으로 충분한 경우가 많다.
Page-level design work라면 최소 하나의 desktop viewport와 하나의 mobile-sized viewport를 확인하고, 비교한 route 또는 viewport를 PR이나 handoff note에 남긴다.

## 리뷰 체크

UI 변경을 리뷰할 때는 다음을 확인한다.

- 페이지가 활성 Stitch 디자인 시스템으로 보이는가.
- 새 color, font, spacing, component treatment가 그 시스템과 일관되는가.
- 새 CSS는 기본적으로 local이며, global CSS는 앱 전역 behavior에만 사용되는가.
- Stitch reference가 없는 페이지가 별도 디자인 언어를 만들지 않고 시각적으로 호환되는가.
- Stitch 기반 변경이 unit 또는 integration test만이 아니라 실제 browser에서 확인되었는가.
