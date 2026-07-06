---
description: history 중심 pull request 준비
---

# pr

사용자가 `pr`, `$pr`, pull request preparation, PR unit decision, PR description drafting, PR review readiness, squash-merge history cleanup 등을 요청할 때 사용합니다.

## 핵심 동작

- PR을 열기 전에 PR 유형과 merge 전략을 먼저 결정합니다. 하위 브랜치 PR(`feature/{name}/{layer}` → `feature/{name}`)은 squash merge로 wip 커밋을 하나의 논리 단위로 정리합니다. 통합 브랜치 PR(`feature/{name}` → `main`)은 `--no-ff`로 커밋을 보존하여 main history에서 기능 추적이 가능하게 합니다.
- PR 제목과 본문은 나중에 어떤 PR이 변경을 도입했고 왜 그랬는지 이해해야 하는 사람을 기준으로 최적화합니다.
- 파일 수나 커밋 수보다 리뷰 가능하고 history 의미가 분명한 PR 단위를 우선합니다.
- PR 제목과 설명은 영어로 작성합니다.
- working tree에 커밋되지 않은 변경이 있거나 PR 경계가 불명확하면 PR 마무리 전에 `cm`을 사용합니다.
- 명시적인 `pr` 또는 `$pr` 요청은 전체 PR 게시 흐름을 완료해도 된다는 승인으로 봅니다: diff 확인, 필요한 커밋 준비, 브랜치 생성 또는 선택, 관련 검증 실행, 브랜치 push, draft GitHub PR 생성. 사용자가 명시적으로 요청하지 않는 한 `pr`을 draft 전용, 계획 전용, 본문 전용 작업으로 해석하지 않습니다.
- 명시적인 `pr` 요청이 있고 커밋되지 않은 변경이 명확한 커밋 준비 상태라면, 커밋 여부만 묻고 멈추지 않고 필요한 커밋을 먼저 준비합니다.
- PR을 준비하거나 열거나 업데이트하라는 명시적 요청은 명확한 단일 PR 또는 stacked PR 묶음을 만들기 위해 필요한 commit, branch, base branch, PR 도구 작업을 추가 확인 없이 진행해도 된다는 승인으로 봅니다.
- PR을 열거나 업데이트하라는 명시적 요청은 준비된 제목과 본문으로 PR 도구를 사용해도 된다는 승인으로 봅니다.
- 합리적인 PR 또는 stack 형태가 둘 이상이면 history 의미가 가장 명확한 선택지를 고르고 그 이유를 보고합니다. 유효한 review 형태 중 하나를 고르기 위해 멈춰서 사용자에게 묻지 않습니다.
- 검증 결과를 지어내지 않습니다. 실행한 테스트, 생략한 테스트, 실행할 수 없었던 테스트를 명확히 보고합니다.
- 사용자가 명시적으로 지시하지 않는 한 사용자 변경사항을 되돌리거나 덮어쓰거나 삭제하지 않습니다.

## PR 생성 기본값

history를 준비한 뒤 기본적으로 draft PR을 생성합니다. blocker가 없는 한 `pr` 요청은 각 PR unit에 로컬 커밋, push된 브랜치, draft PR URL이 모두 생길 때 완료됩니다.

PR 생성에는 GitHub CLI (`gh`)를 사용합니다. push는 성공했지만 PR 생성이 막힌 경우 push된 브랜치와 GitHub compare URL을 보고합니다.

PR 생성 전 확인은 기존 split-rule blocker가 적용될 때만 합니다: diff가 미완성으로 보이는 경우, 관련 없는 사용자 작업을 안전하게 분리할 수 없는 경우, product 또는 ownership 결정을 추론할 수 없는 경우, 브랜치/base/remote 상태가 잘못된 history를 대상으로 할 수 있는 경우.

## 브랜치 구조

PR 유형, merge 전략, base branch를 결정하기 전에 현재 브랜치 계층을 파악합니다.

```
main
 └─ feature/{name}                    (통합 브랜치)
     ├─ feature/{name}/schema
     ├─ feature/{name}/backend
     └─ feature/{name}/ui
```

**통합 브랜치 부재 처리**: 현재 브랜치가 하위 패턴(`feature/{name}/{layer}`)인데 부모 통합 브랜치(`feature/{name}`)가 존재하지 않으면:
1. 작업을 중단하고 PR을 열지 않습니다.
2. 현재 브랜치 이름에서 통합 브랜치 이름을 추론합니다.
3. 추론된 이름을 제안으로 제시하고 사용자에게 확인, 다른 이름 입력, 또는 취소 여부를 묻습니다.
4. 사용자가 이름을 확인한 뒤에만 기본 브랜치에서 통합 브랜치를 생성합니다.

**통합 브랜치 만료**: 통합 브랜치가 2주 이상 main에 merge되지 않은 경우 diff 누적으로 인한 conflict 위험을 알립니다.

## PR 유형별 Merge 전략

| PR 유형 | Merge 명령 | 이유 |
|---|---|---|
| 하위 브랜치 → 통합 브랜치 | `git merge --squash` | wip 커밋 정리, 논리 단위 커밋 생성 |
| 통합 브랜치 → main | `git merge --no-ff` | 레이어별 커밋 보존, main history에서 기능 경계 가시성 유지, `git bisect` 활용 가능 |
| main → 통합 브랜치 (최신화) | `git merge main` | 통합 브랜치는 공유 브랜치. rebase는 커밋 해시를 바꾸므로 하위 브랜치 기반이 깨짐 |

**Rebase 원칙**: 개인 브랜치(하위 브랜치)에서는 rebase 허용. 공유 브랜치(통합 브랜치, main)에서는 rebase 금지.

## 포함 스크립트

- PR 단위를 결정하기 전에 구조화된 branch 비교 근거가 필요하면 `scripts/inspect-pr-context.sh`로 read-only 정보를 수집합니다.
- Stacked PR에서는 `scripts/render-stack-order.sh`로 branch chain, parent/child 위치, merge 순서, retarget/rebase note, 최종 검증 대상을 생성합니다.
- 이 스크립트들은 deterministic 근거와 stack note를 제공합니다. PR 단위 결정, 오래 남을 `Why` 작성, 사용자에게 보고할 판단을 대체하지 않습니다.
- 정확한 옵션은 `bash .codex/skills/pr/scripts/<script>.sh --help`로 확인합니다.

## PR 단위 기준

PR은 하나의 squash-merge history event입니다. 브랜치 히스토리에 squash commit 제목과 PR 본문만 남아도 이해 가능해야 합니다.

Stacked PR은 명확한 review 및 history 단위라면 그 자체로 일시적으로 실행 불가능할 수 있습니다. 중간 PR을 각각 독립 실행 가능하게 만들기 위해 논리적으로 분리되는 PR을 억지로 합치지 않습니다. 최종 stack 상태는 실행 가능해야 하며, 남은 검증 gap이 있다면 명시해야 합니다.

이 기준은 빠른 PR unit check로 사용하고, 명확한 경계를 지연시키는 이유로 사용하지 않습니다.

- **단일 history event**: 하나의 문제, 요구사항, 결정, 정리로 설명할 수 있어야 합니다.
- **명확한 이유**: 미래의 독자가 전체 diff를 복원하지 않아도 왜 변경이 필요했는지 이해할 수 있어야 합니다.
- **리뷰 가능한 경계**: 리뷰어가 하나의 일관된 결정으로 승인하거나 거절할 수 있어야 합니다.
- **revert 가능한 의도**: squash commit을 revert하면 관련 없는 작업이 아니라 하나의 일관된 변경이 제거되어야 합니다.
- **일관된 검증**: 테스트나 점검 근거가 PR의 의도와 연결되어야 하며, final-stack 검증이 적절한 경계라면 그 사실을 명확히 적어야 합니다.
- **드러난 stack 의존성**: PR이 다른 PR에 의존하거나 child PR이 들어오기 전까지 일시적으로 깨진다면 parent, child, 실행 가능한 최종 상태가 PR 본문에 드러나야 합니다.
- **숨은 묶음 없음**: 관련 없는 리팩터링, 의존성 업그레이드, 문서 변경, 정리가 기능이나 수정 아래 숨겨져 있으면 안 됩니다.

후보가 불명확하면 reviewer가 하나의 결정으로 승인할 수 있는 가장 작은 history-meaningful 경계를 선택합니다. 후보가 일관된 history event이지만 일시적으로 깨진 중간 상태를 만든다면, 더 큰 mixed PR보다 의존성과 merge 순서를 명시한 stacked PR을 우선합니다. 나누면 history가 더 이해하기 어려워지는 경우에는 더 큰 PR을 유지합니다.

## 분리 규칙

함께 둡니다:

- 기능, 수정, 리팩터링과 이를 직접 검증하는 테스트
- 같은 변경을 이해 가능하고 동작 가능하게 만드는 타입, 설정, 마이그레이션, lockfile, 문서
- 주요 변경을 가능하게 하기 위한 작은 지원성 정리

다음 경우에는 분리를 우선합니다:

- 변경이 서로 다른 product, operational, convention 결정을 나타내는 경우
- 다른 reviewer 또는 다른 rollback 판단이 필요한 경우
- dependency, tooling, test-infrastructure 변경이 근처 product 변경 없이도 의미 있는 경우
- 문서나 cleanup이 같은 변경이 아니라 별도 durable decision을 설명하는 경우

다음 경우에만 PR 계획을 확정하기 전에 사용자에게 확인합니다:

- diff 일부가 끝나지 않은 사용자 작업처럼 보이는 경우
- diff에 관련 없는 사용자 작업이 있고 안전하게 분리할 수 없는 경우
- PR 또는 stack 경계가 요청과 코드에서 추론할 수 없는 product, rollout, ownership, reviewer 결정에 해당하는 경우
- branch, remote, base branch 상태가 안전하지 않거나 애매해서 PR이 잘못된 history를 대상으로 열릴 수 있는 경우

## PR을 열기 전 분리 판단

PR을 열거나 업데이트하기 전에 항상 PR 단위를 결정하고, 그 결정을 PR 준비 결과나 최종 보고에 포함합니다. 경계가 명확하면 분리 결정을 승인받기 위해 멈추지 않습니다.

PR 단위를 결정하기 전에 `scripts/inspect-pr-context.sh`, `git diff --name-status`, 또는 브랜치 비교로 diff를 확인합니다. 변경 종류는 자동 분리 규칙이 아니라 판단 근거로 사용합니다:

- 문서 전용 convention 변경
- runtime 또는 API 동작 변경
- lint, build, test tooling, harness 변경
- 공유 refactor 또는 cross-layer contract
- dependency 또는 lockfile 변경
- tests

여러 변경 종류가 보인다는 이유만으로 기계적으로 분리하지 않습니다. 섞인 변경들이 서로 다른 history, review, rollback 결정을 나타낼 때 분리합니다. 하나의 일관된 요구사항을 설명, 검증, 반영하는 데 필요하면 함께 둡니다.

여러 변경 종류를 하나의 PR에 유지한다면 PR 본문이나 최종 보고에 이유를 적습니다. 하나의 일관된 요구사항이거나, stacked PR로 명시해도 더 명확하지 않은 중간 상태 깨짐을 피해야 하거나, 동작을 검증하는 테스트를 같은 경계에 둬야 하거나, 같은 변경에 필요한 작은 공유 contract 변경인 경우입니다.

## Stacked PR

여러 review 가능한 history event가 서로 관련되어 있고 최종 상태를 함께 평가해야 할 때 stacked PR을 사용합니다.

- 명확한 `pr`, `open PR` 또는 같은 의미의 요청은 stack 경계가 명확한 경우 전체 stacked PR 묶음을 생성해도 된다는 승인으로 봅니다.
- stack은 base branch에서 바깥쪽으로 만듭니다. 예: `main <- pr-1 <- pr-2 <- pr-3`
- 각 child PR의 base branch는 parent PR branch로 설정합니다.
- 모든 stacked PR과 최종 사용자 보고에 merge 순서를 명확히 적습니다. merge 순서는 parent에서 child 방향입니다. `main <- pr-1 <- pr-2 <- pr-3`라면 `pr-1`, `pr-2`, `pr-3` 순서로 merge합니다.
- parent PR이 merge된 뒤에는 child PR을 다음 parent 또는 base branch로 retarget하거나 rebase해야 한다는 점을 적습니다.
- 중간 PR이 독립적으로 실행 가능하지 않다면 그 이유, 실행 가능한 상태를 완성하는 child PR, 최종 검증 대상을 적습니다.
- 순서가 제품 결정에 가깝거나, 의존성 그래프가 애매하거나, branch 또는 remote 상태가 안전하지 않거나, diff에 미완성 또는 관련 없는 사용자 작업이 있을 때만 stack 생성 전에 묻습니다.

## cm Skill과의 관계

`cm`은 commit-level 준비 단계이고, `pr`은 PR-level history 단계입니다.

- 커밋되지 않은 변경이 있으면 diff를 확인하고 `cm` 규칙으로 atomic commit 후보를 먼저 정합니다.
- 후보가 명확하고 요청된 PR에 속하며 커밋 준비가 끝났다면, PR draft 전에 추가 확인 없이 커밋합니다.
- PR 단위가 항상 하나의 커밋과 같은 것은 아닙니다. 여러 atomic commit이 하나의 squash-merge history event를 만들 수 있습니다.
- 각 커밋의 `Why:` 본문은 PR-level `Why`의 입력으로 사용하되, 커밋 메시지를 changelog처럼 붙여넣지 않습니다.
- `cm` 과정에서 보고된 검증은 PR의 `Verification` 섹션으로 옮깁니다.
- `cm`이 여러 관련 없는 커밋 그룹을 제안한다면, 경계를 추론할 수 있을 때 명확한 여러 PR 또는 stacked PR 묶음을 만듭니다. 합치거나 나누는 결정이 product scope, ownership, rollout 의도를 바꾸는 경우에만 묻습니다.

## PR 제목 규칙

제목은 기본 squash-merge commit subject가 되므로 `git log`에서 유용해야 합니다.

제목 형식:

```text
<type>: <imperative summary>
```

예:

```text
feat: add health check endpoint
fix: reject invalid registration payloads
docs: document PR history rules
```

규칙:

- 변경에 맞으면 Conventional Commit 스타일을 따릅니다.
- summary는 imperative verb로 시작합니다.
- 구현 세부사항보다 의도를 우선합니다.
- scope는 명확한 가치가 있을 때만 사용합니다.
- 제목 끝에는 마침표를 붙이지 않습니다.
- `fix bug`, `update code`, `refactor stuff`처럼 모호한 제목은 피합니다.

## PR 본문 규칙

기본 구조입니다. stacked PR이 아니면 `Stack / Merge Order`를 생략합니다.
통합 브랜치 PR(`feature/{name}` → `main`)에는 `Merge Strategy` 섹션을 포함하여 `--no-ff` 요건을 리뷰어에게 명시합니다.

```markdown
## Summary

- ...

## Stack / Merge Order

- ...

## Why

...

## Changes

- ...

## Verification

- ...

## Merge Strategy

`--no-ff`로 merge합니다. squash하지 않습니다. 레이어별 커밋 히스토리 보존 및 `git bisect` 활용을 위한 것입니다.

## Risk / Notes

- ...
```

하위 브랜치 PR에는 `Merge Strategy`를 생략합니다(squash가 기본 예상 전략).

섹션 규칙:

- `Summary`: PR이 달성하는 일을 1-3개 bullet로 설명합니다.
- `Stack / Merge Order`: stacked PR일 때만 포함합니다. branch chain, 이 PR의 순서, parent 및 child PR, merge 순서, parent merge 후 retarget/rebase 필요 여부, 이 PR이 독립적으로 실행 가능한지를 적습니다.
- `Why`: 이 PR이 존재하는 이유가 되는 문제, 요구사항, 결정, tradeoff, 제약, 대안을 오래 남을 맥락으로 보존합니다.
- `Changes`: 의미 있는 동작 또는 구조 변경을 나열합니다. 파일 경계 자체가 핵심이 아니면 파일별 diff 요약은 피합니다.
- `Verification`: 실행한 명령, 테스트, 수동 확인, 점검을 정확히 적습니다. 생략되었거나 실행할 수 없었던 검증도 관련 있으면 포함합니다.
- `Risk / Notes`: 마이그레이션, 호환성 우려, rollout note, follow-up, reviewer focus를 적거나 특별한 내용이 없으면 `None`이라고 적습니다.

포함하지 않을 내용:

- 긴 commit-by-commit changelog
- 일반적인 checklist filler
- 실제로 실행하지 않은 테스트가 통과했다는 주장
- PR 본문이 아니라 사용자 응답에 들어가야 하는 리뷰 지시

## 작업 흐름

1. 브랜치 계층(하위 브랜치, 통합 브랜치, 기본 브랜치)을 파악하고 PR 유형과 merge 전략을 가장 먼저 결정합니다. 하위 브랜치 패턴이지만 통합 브랜치가 없으면, 작업을 중단하고 추론된 통합 브랜치 이름을 제안한 뒤 사용자 확인을 기다립니다.
2. `git status --short`, 최근 커밋, 관련 diff 또는 브랜치 비교를 확인합니다. 구조화된 fact pack이 PR 단위 결정을 더 빠르거나 덜 오류 나게 만든다면 `scripts/inspect-pr-context.sh`를 사용합니다.
3. working tree에 커밋되지 않은 변경이 있으면 먼저 `cm` 규칙으로 atomic commit 후보를 찾습니다.
4. 후보가 명확하고 커밋 준비가 끝났으며 요청된 PR에 속하면 PR draft 전에 stage하고 commit합니다.
5. diff가 미완성으로 보이거나, 관련 없는 사용자 작업을 안전하게 분리할 수 없거나, product, scope, ownership, reviewer, base-branch 결정이 필요한 경우에만 사용자에게 확인합니다. 명확한 경계가 여러 PR이라는 이유만으로 묻지 않습니다.
6. PR unit checklist와 split gate로 하나의 PR인지 stacked PR 묶음인지 결정합니다.
7. Stacked PR이라면 PR을 열거나 업데이트하기 전에 branch chain, parent/child PR, merge 순서, 실행 가능한 최종 검증 대상을 정합니다. merge-order 실수를 줄이기 위해 `scripts/render-stack-order.sh`를 사용합니다.
8. PR을 열거나 업데이트하기 전에 PR 단위 결정과 merge 전략을 기록합니다.
9. PR 제목은 하위 브랜치 PR의 경우 squash-merge commit subject로, 통합 브랜치 PR의 경우 기능 경계를 나타내는 레이블로 작성합니다.
10. PR 본문은 기본 섹션을 사용하고 오래 남을 `Why` 맥락을 강조합니다. 통합 브랜치 PR에는 `Merge Strategy` 섹션을 포함합니다.
11. 검증 gap은 PR 본문이나 최종 응답에 보고합니다. 사용자가 해당 gate를 요청했거나 gap이 PR을 오해하게 만들 때만 PR 생성을 막습니다.
12. blocker가 없는 한 준비된 제목, 본문, base branch, merge-order note로 명확한 단일 PR 또는 stacked PR 묶음을 추가 확인 없이 push하고 draft PR을 생성합니다.