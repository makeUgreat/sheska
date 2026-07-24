---
title: 디자인 시스템
lang: ko
audience: both
applies_to:
  - apps/ui
source: ../en/design.md
related:
  - ./design-token.md
  - ./design-component.md
read_when: visual design, CSS structure, design token, typography, color, spacing, component styling을 변경하거나 검토할 때
---

# 디자인 시스템

## 출처

`apps/ui`는 앱에 선택된 활성 Stitch 디자인 시스템을 따른다.
향후 디자인 작업에서 명시적으로 교체하기 전까지 Stitch를 시각 방향의 source of truth로 사용한다.

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

## 브랜드와 스타일

Brand identity는 엄격한 minimalism과 따뜻한 editorial edge 사이의 균형을 잡는 고정밀 technical aesthetic을 중심으로 한다. 대상 독자는 functional clarity와 deep focus를 중시하는 developers, architects, researchers다.

Design style은 terminal environment와 high-end print design에서 영감을 받은 **Minimalist with a Technical Edge**다. 넓은 whitespace, 의도적인 high contrast, 하나의 accent color를 사용해 cognitive noise 없이 시선을 유도한다. 감성적 인상은 calm authority, precision, intellectual rigor다. 절제된 monochrome-first palette를 유지하기 위해 모든 green tone은 엄격히 제외한다.

## 디자인 토큰

[디자인 토큰](./design-token.md)을 참고한다.

## 컴포넌트

[디자인 컴포넌트](./design-component.md)를 참고한다.
