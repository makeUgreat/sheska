---
title: UI Visual Regression 컨벤션
lang: ko
audience: both
applies_to:
  - apps/ui
source: ../en/visual-regression.md
related:
  - ./design.md
  - ./design-token.md
  - ./design-component.md
  - ./test.md
read_when: Playwright screenshot, pixel-diff, Stitch visual fidelity, visual baseline, browser-rendered design regression check를 결정하거나 작성하거나 리뷰하거나 갱신할 때
---

# UI Visual Regression 컨벤션

UI visual regression test는 browser에 렌더링된 UI가 활성 Stitch design reference와 시각적으로 일치하는지 검증한다.
Business-flow user journey test를 소유하는 repository `e2e` workspace와는 분리한다.

## 적용 범위

Visual fidelity, layout integrity, responsive rendering, design effect를 검증하는 Playwright 기반 screenshot 또는 pixel-diff test에는 이 문서를 사용한다.

다음에 대한 신뢰가 필요하면 visual regression test 범위에 포함한다.

- Route가 활성 Stitch screen의 visual intent와 계속 맞는지 확인하는 경우.
- Design-system token, font, spacing, color, animation, responsive layout 변경이 시각적으로 회귀하지 않았는지 확인하는 경우.
- 실제 browser rendering에서 content가 읽기 쉽고, 정렬되어 있고, 겹치지 않는지 확인하는 경우.

Business behavior, domain correctness, API contract, multi-step user story는 visual regression test 범위가 아니다.
해당 동작은 성격에 따라 `jsdom` UI test, API test, 또는 `e2e` workspace가 다룬다.

## 소유권 경계

`apps/ui`는 UI rendering과 design fidelity를 검증하므로 visual regression test를 소유한다.
Root `e2e` workspace는 실행 중인 시스템을 대상으로 하는 완전한 user journey를 소유한다.

Visual regression test는 화면을 deterministic하게 만들기 위해 controlled fixture나 API interception을 사용할 수 있다.
이는 business E2E test와 다르다. Visual regression은 backend integration을 증명하지 않으므로 full system exercise보다 안정적인 rendering data가 더 중요하다.

둘 다 Playwright를 사용한다는 이유만으로 visual fidelity check를 business E2E suite로 옮기지 않는다.
두 suite는 실패 의미, setup 요구사항, maintenance workflow가 다르다.

## 참조 소스

기대 시각 기준에는 Stitch export를 우선 사용한다.

- Design-system style intent는 `design.md`를 사용한다.
- Design-system token은 `design-token.md`를 사용한다.
- Design-system component guidance는 `design-component.md`를 사용한다.
- Screen-level comparison에는 exported Stitch screenshot을 사용한다.
- Component structure나 layout behavior를 명확히 해야 할 때는 exported Stitch generated code를 사용한다.

활성 Stitch project와 screen ID는 [디자인 시스템](./design.md)을 따른다.
Reference를 갱신할 때는 사용자가 최신으로 제공한 Stitch Instructions를 사용하고 hosted artifact를 `curl -L`로 다운로드한다.
활성 Stitch source와 충돌한다면 오래된 chat screenshot, stale local export, baseline screenshot을 source of truth로 보지 않는다.

Stitch가 의도적으로 변경되면 reference artifact와 screenshot baseline을 구현 변경과 같은 변경 단위에서 갱신한다.
Design change를 확인하지 않고 실패한 visual test를 통과시키기 위해 baseline만 갱신하지 않는다.

## Stitch 정합성 리뷰 Agent

Stitch 기반 screen에 대해 새 visual baseline을 승인하거나 기존 baseline을 갱신할 때는 Stitch 정합성 리뷰 agent를 사용한다.
Agent의 역할은 Stitch reference와 app-rendered screenshot을 비교하고, 사람이 리뷰할 design-alignment finding을 보고하는 것이다.

공식 project-scoped agent 정의를 사용한다.

- Codex custom agent: `.codex/agents/stitch-fidelity-reviewer.toml`
- Claude project subagent: `.claude/agents/stitch-fidelity-reviewer.md`

Agent에는 다음을 제공한다.

- 사용할 수 있다면 대상 screen과 viewport의 Stitch screenshot.
- 같은 route와 viewport에 대해 Playwright가 생성한 app screenshot.
- 의도한 design을 명확히 하는 `design.md`, `design-token.md`, `design-component.md`, exported Stitch generated code.
- Route, viewport, state, fixture data, 의도적으로 허용한 차이.

Agent는 정확한 구현 동일성이 아니라 perceptual alignment를 평가한다.
Layout hierarchy, spacing, typography, color treatment, component shape, visual effect, responsive behavior, 누락된 element, overflow, clipping, text overlap의 차이를 지적해야 한다.

Agent는 finding을 다음처럼 분류한다.

- Blocking mismatch: 구현이 Stitch design intent를 보존하지 못한 경우.
- Review mismatch: 차이가 허용될 수도 있지만 사람의 결정이 필요한 경우.
- Accepted difference: product data, platform constraint, 의도한 local adaptation 때문에 설명되는 차이.

Agent는 사람의 승인을 대체하지 않는다.
Agent finding이 리뷰되고, 허용된 차이가 PR 또는 handoff note에 기록된 뒤에만 baseline을 생성하거나 갱신할 수 있다.

## 테스트 설계

넓은 screenshot coverage보다 신호가 큰 소수의 visual test를 선호한다.
Stitch screen을 직접 구현한 route나 shared layout primitive부터 시작한다.

각 visual test는 다음을 만족해야 한다.

- 하나의 안정적인 route 또는 component state를 렌더링한다.
- Data, time, locale-sensitive text, loading state를 deterministic하게 만든다.
- 명시적인 viewport를 설정한다.
- Target state에 필요한 font, image, animation, network activity가 준비될 때까지 기다린다.
- Design assertion과 무관한 dynamic content는 mask하거나 disable한다.

Page-level Stitch implementation은 최소 하나의 desktop viewport와 하나의 mobile-sized viewport를 커버한다.
Design에 회귀 가능성이 있는 의미 있는 breakpoint가 있을 때만 viewport를 더 추가한다.

## Assertion

Visual baseline에는 Playwright screenshot assertion을 사용한다.
Behavior assertion은 screenshot을 찍기 전 target state가 준비되었는지 확인하는 최소한으로만 사용한다.

보호하려는 contract가 CSS property 자체인 경우가 아니라면 visual test에서 정확한 CSS property 값을 assertion하는 것은 피한다.
Browser screenshot 없이 Vitest에서 안정적으로 증명할 수 있는 behavior는 더 저렴한 test layer에 둔다.

## Baseline And Diff 정책

Visual baseline은 UI visual test suite가 소유하는 안정적이고 리뷰 가능한 위치에 저장한다.
Baseline file name은 route, state, viewport를 명확하게 드러내야 한다.

Pixel diff는 review signal이지 correctness의 자동 증명이 아니다.
Diff가 나타나면 의도한 design update인지, implementation bug인지, rendering noise인지 판단한다.

의미 있는 layout, color, typography, spacing 회귀를 잡되 사소한 antialiasing noise로 실패하지 않는 보수적인 diff threshold를 사용한다.
정기적으로 통과시키기 위해 느슨한 threshold가 필요하다면 threshold를 받아들이기 전에 test setup을 개선한다.

## Runtime And CI

Visual regression test는 실제 browser와, 가능하면 production-like UI build를 대상으로 실행한다.
Deterministic fixture로 visual state를 표현할 수 없다면 예외적으로 full backend stack이 필요할 수 있지만 기본 요구사항은 아니다.

일상적인 behavior check가 빠르게 유지되도록 visual regression command는 `pnpm test`와 분리한다.
Baseline storage, browser installation, font availability, artifact upload, update workflow가 안정화된 뒤 CI에 visual suite를 추가한다.

## 리뷰 체크

Visual regression 변경을 리뷰할 때는 다음을 확인한다.

- Screenshot 유지보수 비용을 감당할 만큼 가치 있는 design surface를 보호하는가.
- Fixture data가 deterministic하며 visual test를 business-flow test로 바꾸지 않는가.
- Baseline update가 의도한 Stitch 또는 implementation 변경과 연결되어 있는가.
- 새로 만들거나 갱신한 Stitch 기반 baseline에 Stitch 정합성 리뷰 agent 비교가 포함되어 있는가.
- 테스트한 viewport가 design risk와 맞는가.
- CI가 통과했다는 이유만으로 diff를 받아들이지 않고 시각적으로 검사했는가.
