---
description: history 중심 pull request 준비
---

# pr

사용자가 `pr`, `$pr`, pull request preparation, pull request creation, PR review readiness 등을 요청할 때 사용합니다.

## 원칙

PR은 하나의 일관된 결정으로 review 가능해야 합니다. 변경이 여러 layer나 결정으로 이루어져 있다면, 하나의 큰 PR보다 GitHub 네이티브 stacking(`gh-stack` CLI)으로 만든 **stacked PR 묶음**을 기본으로 사용합니다 — 각 layer가 독립적으로 review 가능하면서도 최종 상태는 함께 평가할 수 있습니다. 이 stacking 정책이 이 skill의 핵심이며, 만드는 방법은 아래 "Stacked PR"을 참고합니다.

## 핵심 동작

- merge 전략보다 PR 유형을 먼저 결정합니다: 하위 브랜치 PR은 통합 브랜치로 squash, 통합 브랜치 PR은 main으로 `--no-ff` merge합니다.
- PR 제목과 설명은 영어로 작성합니다. 기본값은 draft PR입니다.
- 명시적인 `pr`/`$pr` 요청, 또는 PR을 열거나 업데이트하라는 명시적 요청은 커밋 준비, 브랜치/stack 설정, push, draft PR 생성까지 전체 흐름을 추가 확인 없이 끝까지 진행해도 된다는 승인으로 봅니다(아래 blocker가 적용되는 경우 제외). 생성 경로가 있는데 제목만 작성하고 멈추는 식으로 중간에 멈추지 않습니다.
- working tree에 커밋되지 않은 변경이 있거나 PR 경계가 불명확하면 먼저 `cm`을 사용합니다.
- 현재 브랜치에 이미 열린 PR이 있다면, 진행 전에 연관성을 먼저 판단합니다(PR 단위: 단일 vs Stacked 참고): 기존 PR의 의도를 이어가는 작업이면 업데이트입니다 — push하고 본문을 갱신합니다. 연관성이 떨어지는 작업이면 기존 PR에 합치지 말고 그 위에 새로운 stacked PR을 엽니다.
- 합리적인 PR 또는 stack 형태가 둘 이상이면 history 의미가 가장 명확한 것을 고르고 이유를 보고합니다. 멈춰서 묻지 않습니다.
- 검증 결과를 지어내지 않습니다 — 실행/생략 여부와 이유를 보고합니다.
- 사용자가 명시적으로 지시하지 않는 한 사용자 변경사항을 되돌리거나 덮어쓰거나 삭제하지 않습니다.
- 다음 경우에만 진행 전에 확인합니다: diff가 미완성으로 보이는 경우, 관련 없는 사용자 작업을 안전하게 분리할 수 없는 경우, 요청에서 product/ownership/reviewer 결정을 추론할 수 없는 경우, branch/base/remote 상태가 잘못된 history를 대상으로 할 만큼 안전하지 않은 경우.

PR 생성에는 GitHub CLI (`gh`)를 사용합니다. push는 성공했지만 PR 생성이 막힌 경우 push된 브랜치와 GitHub compare URL을 보고합니다.

## 브랜치 구조 & Merge 전략

```
main
 └─ feature/{name}                    (통합 브랜치)
     ├─ feature/{name}/schema
     ├─ feature/{name}/backend
     └─ feature/{name}/ui
```

이 다이어그램은 naming만 보여줄 뿐 git parentage(부모-자식 관계)를 의미하지 않습니다. 서로 독립적인 하위 브랜치는 각각 통합 브랜치에서 직접 분기합니다. backend가 schema에 의존하는 것처럼 서로 의존하는 하위 브랜치라면, 대신 stacked PR 묶음으로 연결합니다 — `schema`는 통합 브랜치 기준, `backend`는 `schema` 기준, `ui`는 `backend` 기준으로 만들고, 통합 브랜치를 stack의 trunk로 사용합니다(아래 Stacked PR 참고).

| PR 유형 | Merge | 이유 |
|---|---|---|
| 하위 브랜치 → 통합 브랜치 | `git merge --squash` | wip 커밋을 하나의 논리 단위로 정리 |
| default 브랜치 → main (feature 없음) | `git merge --squash` | 통합 브랜치 없는 단독 변경. 하위 브랜치 PR과 동일하게 처리 |
| 통합 브랜치 → main | `git merge --no-ff` | 레이어별 history 보존, `git bisect` 활용 |
| main → 통합 브랜치 (최신화) | `git merge main` | 공유 브랜치라 rebase 시 진행 중인 하위 브랜치가 깨짐 |

Rebase는 개인 브랜치(하위 브랜치)에서만 허용합니다 — 통합 브랜치와 main에서는 금지합니다.

하위 브랜치의 부모 통합 브랜치가 아직 없으면, 작업을 중단하고 추론된 이름을 제안한 뒤 사용자 확인을 기다린 후에 생성합니다. 통합 브랜치가 2주 이상 main에 merge되지 않았다면 conflict 위험을 알립니다.

## PR 단위: 단일 vs Stacked

PR은 하나의 squash-merge history event입니다 — 제목과 본문만으로 이해 가능해야 합니다. 기본값은 단일 PR입니다. 변경이 각각 독립적으로 review할 가치가 있는 관련되었지만 분리 가능한 layer(예: schema → backend → ui)로 이루어져 있거나, 하나의 PR로 묶으면 서로 다른 product/rollout/reviewer 결정이 섞이게 되는 경우에는 **stacked PR**을 사용합니다.

함께 둡니다: 변경과 이를 이해/검증하는 데 필요한 테스트, 타입, 설정, 문서. 다음은 분리합니다: 서로 다른 product, rollout, reviewer 결정을 나타내는 부분, 또는 그 자체로 의미 있는 dependency/tooling 작업. 여러 종류의 변경(문서, runtime, tooling, tests)이 함께 있다는 사실 자체는 분리 이유가 아닙니다 — 서로 다른 review 또는 rollback 결정을 나타낼 때만 분리합니다.

stack layer가 명확한 review 단위라면 그 자체로 일시적으로 실행 불가능해도 괜찮습니다 — 분리 가능한 PR을 억지로 합쳐서 독립 실행 가능하게 만들기보다, 이유와 이를 완성하는 child PR을 본문에 적습니다.

브랜치에 이미 열린 PR이 있고 추가 작업이 생겼을 때도 같은 기준을 적용합니다: 기존 PR의 의도를 이어가는 작업은 그 PR 안에 둡니다 — push하고 본문의 `Summary`/`Changes`/`Verification`을 갱신합니다. 연관성이 떨어지는 작업은 기존 PR에 합치지 말고 그 위에 새로운 stacked PR로 엽니다 — 이미 열린 브랜치를 stack tracking으로 편입하는 방법은 아래 Stacked PR 참고.

## Stacked PR (gh stack)

stacked PR은 각 PR의 base branch를 수동으로 설정하거나 merge 후 수동으로 retarget하는 대신, `gh-stack` CLI extension을 사용하는 GitHub 네이티브 stacked pull request 기능으로 만들고 엽니다. GitHub는 네이티브 stack에 속한 PR의 base branch 수정을 막습니다 — `gh pr edit --base`는 실패하거나 PR을 불일치 상태로 남기므로, 재구성은 반드시 `gh stack` 명령(`rebase`, `modify`, `sync`)으로만 합니다.

- 사전 준비: `gh extension list`로 확인하고, 없으면 `gh extension install github/gh-stack`으로 설치합니다.
- `<trunk>`은 브랜치 계층을 따릅니다: 해당 feature의 하위 브랜치 layer를 stack으로 만들 때는 통합 브랜치(`feature/{name}`), 통합 브랜치가 없는 stack(default 브랜치 계층)이면 `main`입니다.
- 커밋을 준비하면서 만듭니다: trunk 바로 위 첫 branch에서 `gh stack init --base <trunk> <branch-1>`을 실행하고, 이후 각 layer마다 `gh stack add -m "<msg>" <branch-N>`을 실행합니다.
- 이미 PR이 열려 있지만 아직 stack으로 추적되지 않는 브랜치 위에 새 작업을 쌓으려면, 먼저 그 브랜치를 tracking에 편입합니다: `gh stack init --base <trunk> <existing-branch>`를 실행한 뒤, 그 위에 새 branch로 `gh stack add`를 실행합니다.
- 서로 무관한 여러 branch가 아직 merge되지 않은 같은 trunk를 공유해야 할 때(예: 저장소의 PR 생성 게이트가 깨져 있고 merge 안 된 fix branch만 그 게이트를 통과할 때), 의도한 merge 순서대로 **한 번의** `gh stack init --base <trunk> <branch-1> <branch-2> <branch-3>` 호출로 모든 branch를 한 번에 편입시킵니다 — branch마다 따로 `gh stack init`을 실행하지 않습니다. 같은 외부 trunk에 대해 `init`을 따로 실행하면 GitHub에 각각 별도의 Stack 객체가 생기고, 이를 나중에 `gh stack link`로 하나로 합치는 건 신뢰할 수 없습니다(trunk branch가 이미 삭제된 상태에서 GitHub가 422를 반환하는 사례 확인, 이미 열려 있던 PR의 base가 조용히 깨질 수 있음). 각 PR의 `Stack Context`에는 이 의존관계가 product/review 의존이 아니라 build-gate 우회를 위한 부수적인 것임을 명시합니다.
- `gh stack submit`으로 전체 stack을 한 번에 push하고 엽니다. 기본값은 draft이며(사용자가 ready-for-review를 요청했을 때만 `--open` 사용), base branch는 자동으로 설정됩니다 — 각 PR은 바로 아래 branch를 대상으로 합니다.
- `gh stack view`(`-s`/`--json`)로 PR을 열기 전에 branch 순서, PR 링크, 커밋을 확인합니다.
- `gh stack merge [<stack-number>|<pr-number>] --squash [-y]`로 최하단부터 merge합니다. 이 프로젝트에서 stack이 쓰이는 모든 계층(하위 브랜치 → 통합 브랜치, 또는 default 브랜치 → main)은 squash로 merge합니다. 유일한 `--no-ff` 단계인 통합 브랜치 → main은 항상 단일 PR이며 stack으로 만들지 않습니다. GitHub이 merge된 PR 위에 남은 PR들을 자동으로 다음 base로 retarget/rebase합니다 — 수동으로 하지 않습니다.
- stack 구성원 하나가 merge되는 즉시(`gh stack merge`든 GitHub에서 직접 하든) 다른 stack 명령보다 먼저 `gh stack sync`부터 실행합니다. squash merge는 대상 branch에 새 커밋을 만들기 때문에, merge된 branch 위에 남은 branch들은 rebase되기 전까지 merge 이전 커밋을 중복으로 갖고 있게 됩니다 — sync보다 먼저 `link`, `submit`, 수동 base 수정을 실행하면 깔끔한 retarget이 아니라 base branch 손상으로 이어집니다.
- upstream/trunk 변경 후에는 `gh stack sync [--prune]`으로 전체 stack을 재동기화합니다.
- stack의 모든 branch는 같은 저장소에 있어야 합니다(cross-fork 불가).
- 최종 사용자 보고에 merge 순서를 적습니다(최하단부터). GitHub의 live stack map이 이미 보여주므로 모든 PR 본문에 정적 텍스트로 중복 기재하지 않습니다.
- 순서가 product 결정에 해당하거나, 의존성 그래프가 애매하거나, branch/remote 상태가 안전하지 않을 때만 stack 생성 전에 묻습니다.

## PR 제목 & 본문

제목 = squash-merge commit subject: `<type>: <imperative summary>` (예: `feat: add health check endpoint`). 마침표 없이, 구현보다 의도 우선, `fix bug` 같은 모호한 제목은 피합니다.

본문 섹션 순서(해당 없는 섹션은 생략):

```markdown
## Summary
- PR이 달성하는 일, 1-3개 bullet.

## Stack Context
stacked PR만: 왜 stack의 일부인지, 이 PR의 위치(예: `2 of 3: schema -> backend -> ui`). 전체 chain이나 merge 순서는 적지 않습니다 — GitHub의 stack map이 이미 실시간으로 보여줍니다.

## Why
이 PR이 존재하는 이유가 되는 문제, 요구사항, 결정, tradeoff.

## Changes
- 의미 있는 동작/구조 변경. 파일별 diff 요약이 아닙니다.

## Verification
- 실행한 정확한 명령/테스트/점검. 생략된 것과 이유 포함.

## Merge Strategy
통합 브랜치 PR만: `--no-ff`, squash하지 않음. traceability와 `git bisect`를 위함.

## Risk / Notes
- 마이그레이션, 호환성, rollout note, 또는 `None`.
```

commit-by-commit changelog, 일반 checklist filler, 실행하지 않은 테스트에 대한 주장은 포함하지 않습니다.

## cm 연계

`cm`은 커밋을 준비하고, `pr`은 PR-level history를 준비합니다. 먼저 `cm` 규칙으로 atomic commit을 만든 뒤, 각 커밋의 `Why:`를 PR의 `Why`에 반영합니다(커밋 메시지를 changelog처럼 붙여넣지 않습니다). `cm`에서 보고된 검증은 PR의 `Verification` 섹션으로 옮깁니다. 여러 atomic commit이 하나의 squash-merge history event를 이루면 하나의 PR에 묶을 수 있습니다.

## 작업 흐름

1. 브랜치 계층(하위 브랜치, 통합 브랜치, default 브랜치)을 파악하고 PR 유형과 merge 전략을 가장 먼저 결정합니다. 하위 브랜치의 통합 브랜치가 없으면 중단하고 사용자 확인 후 생성합니다.
2. `git status --short`, 최근 커밋, diff를 확인합니다(구조화된 정보가 필요하면 `scripts/inspect-pr-context.sh`). working tree에 커밋되지 않은 변경이 있으면 `cm`을 적용하고 커밋합니다.
3. 위 PR 단위 정책으로 단일 PR인지 stacked PR 묶음인지 결정합니다.
4. stack이라면 커밋을 준비하면서 `gh stack init`/`gh stack add`로 만들고, PR을 열기 전에 `gh stack view`로 순서를 확인합니다.
5. 제목, 본문, (통합 브랜치 PR이면) `Merge Strategy`를 작성합니다.
6. push하고 엽니다. 단일 PR: 먼저 `gh pr view`로 확인합니다 — 이미 열린 PR이 있고 새 작업이 그 의도를 이어간다면 push만 합니다(본문이 바뀌었다면 갱신). 새 작업이 연관성 떨어지는 작업이면 기존 PR에 합치지 말고 그 위에 stack으로 엽니다(Stacked PR 참고). stacked 묶음: `gh stack submit`이 stack의 모든 PR을 한 번에 생성하거나 업데이트합니다(기본 draft) — 커밋을 더 추가한 뒤 다시 실행해도 안전합니다. stack의 base branch는 수동으로 설정하지 않습니다.
7. 검증 gap과 merge 순서를 최종 응답에 보고합니다.
