# pr

이 문서는 개발자가 `pr` skill의 의도와 동작 규칙을 빠르게 이해하기 위한 한국어 참고 문서입니다. Codex가 실제로 사용하는 기준은 같은 디렉터리의 `SKILL.md`이며, 두 문서가 충돌하면 `SKILL.md`를 우선합니다.

## 사용 시점

사용자가 `pr`, pull request preparation, PR unit decision, PR description drafting, PR review readiness, squash-merge history cleanup 등을 요청할 때 사용합니다.

## 핵심 동작

- 이 프로젝트는 기본적으로 squash merge를 사용하므로, 각 PR을 영구적인 history record로 봅니다.
- PR 제목과 본문은 나중에 어떤 PR이 변경을 도입했고 왜 그랬는지 이해해야 하는 사람을 기준으로 최적화합니다.
- 파일 수나 커밋 수보다 리뷰 가능하고 history 의미가 분명한 PR 단위를 우선합니다.
- PR 제목과 설명은 영어로 작성합니다.
- working tree에 커밋되지 않은 변경이 있거나 PR 경계가 불명확하면 PR 마무리 전에 `cm`을 사용합니다.
- 명시적인 `pr` 요청이 있고 커밋되지 않은 변경이 명확한 커밋 준비 상태라면, 커밋 여부만 묻고 멈추지 않고 필요한 커밋을 먼저 준비합니다.
- PR을 열거나 업데이트하라는 명시적 요청은 준비된 제목과 본문으로 PR 도구를 사용해도 된다는 승인으로 봅니다.
- 검증 결과를 지어내지 않습니다. 실행한 테스트, 생략한 테스트, 실행할 수 없었던 테스트를 명확히 보고합니다.
- 사용자가 명시적으로 지시하지 않는 한 사용자 변경사항을 되돌리거나 덮어쓰거나 삭제하지 않습니다.

## PR 단위 기준

PR은 하나의 squash-merge history event입니다. 브랜치 히스토리에 squash commit 제목과 PR 본문만 남아도 이해 가능해야 합니다.

각 PR 후보는 다음 기준을 만족해야 합니다.

- **단일 history event**: 하나의 문제, 요구사항, 결정, 정리로 설명할 수 있어야 합니다.
- **명확한 이유**: 미래의 독자가 전체 diff를 복원하지 않아도 왜 변경이 필요했는지 이해할 수 있어야 합니다.
- **리뷰 가능한 경계**: 리뷰어가 하나의 일관된 결정으로 승인하거나 거절할 수 있어야 합니다.
- **revert 가능한 의도**: squash commit을 revert하면 관련 없는 작업이 아니라 하나의 일관된 변경이 제거되어야 합니다.
- **일관된 검증**: 테스트나 점검 근거가 PR의 의도와 연결되어야 합니다.
- **숨은 묶음 없음**: 관련 없는 리팩터링, 의존성 업그레이드, 문서 변경, 정리가 기능이나 수정 아래 숨겨져 있으면 안 됩니다.

후보가 기준을 통과하지 못하면 PR 분리를 제안합니다. 분리하면 history가 더 이해하기 어려워지거나 중간 상태가 깨지는 경우에는 더 큰 PR을 유지하는 이유를 설명합니다.

## 분리 규칙

함께 둡니다.

- 기능, 수정, 리팩터링과 이를 직접 검증하는 테스트
- 같은 변경을 이해 가능하고 동작 가능하게 만드는 타입, 설정, 마이그레이션, lockfile, 문서
- 주요 변경을 가능하게 하기 위한 작은 지원성 정리

기본적으로 분리합니다.

- 기능 작업과 관련 없는 리팩터링
- 버그 수정과 기회주의적 정리
- 의존성 업그레이드와 그 업그레이드된 의존성을 단지 사용하는 동작 변경
- 테스트 인프라 변경과 제품 변경을 검증하는 테스트
- 문서 전용 변경과 runtime 동작 변경
- 다른 리뷰어나 다른 rollback 판단이 필요한 변경

다음 경우에는 PR 계획을 확정하기 전에 사용자에게 확인합니다.

- PR 경계가 코드 구조가 아니라 제품 결정에 가까운 경우
- 리뷰 경계와 history 경계가 충돌하는 경우
- diff 일부가 끝나지 않은 사용자 작업처럼 보이는 경우

## PR을 열기 전 분리 판단

PR을 열거나 업데이트하기 전에 항상 PR 단위를 결정하고, 그 결정을 PR 준비 결과나 최종 보고에 포함합니다. 경계가 명확하면 분리 결정을 승인받기 위해 멈추지 않습니다.

PR 단위를 결정하기 전에 `git diff --name-status`나 브랜치 비교로 diff를 변경 종류별로 묶습니다.

- 문서 전용 convention 변경
- runtime 또는 API 동작 변경
- lint, build, test tooling, harness 변경
- 공유 refactor 또는 cross-layer contract
- dependency 또는 lockfile 변경
- tests

문서 전용 convention 변경과 runtime 동작 변경이 섞이면 기본적으로 분리합니다. lint/tooling 변경과 제품 동작 변경이 섞여도, 같은 PR을 buildable하고 reviewable하게 유지하는 데 꼭 필요한 경우가 아니라면 기본적으로 분리합니다. dependency 변경이 같은 runtime 변경에만 필요한 것이 아니라면 기본적으로 분리합니다.

여러 변경 종류를 하나의 PR에 유지한다면 PR 본문이나 최종 보고에 이유를 적습니다. 예를 들어 중간 상태가 깨지는 것을 피해야 하거나, 동작을 검증하는 테스트를 같은 경계에 둬야 하거나, 같은 변경에 필요한 작은 공유 contract 변경인 경우입니다.

## cm Skill과의 관계

`cm`은 commit-level 준비 단계이고, `pr`은 PR-level history 단계입니다.

- 커밋되지 않은 변경이 있으면 diff를 확인하고 `cm` 규칙으로 atomic commit 후보를 먼저 정합니다.
- 후보가 명확하고 요청된 PR에 속하며 커밋 준비가 끝났다면, PR draft 전에 추가 확인 없이 커밋합니다.
- PR 단위가 항상 하나의 커밋과 같은 것은 아닙니다. 여러 atomic commit이 하나의 squash-merge history event를 만들 수 있습니다.
- 각 커밋의 `Why:` 본문은 PR-level `Why`의 입력으로 사용하되, 커밋 메시지를 changelog처럼 붙여넣지 않습니다.
- `cm` 과정에서 보고된 검증은 PR의 `Verification` 섹션으로 옮깁니다.
- `cm`이 여러 관련 없는 커밋 그룹을 제안한다면, 사용자가 하나로 합치라고 명시하지 않은 한 여러 PR을 제안합니다.

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

기본 구조:

```markdown
## Summary

- ...

## Why

...

## Changes

- ...

## Verification

- ...

## Risk / Notes

- ...
```

섹션 규칙:

- `Summary`: PR이 달성하는 일을 1-3개 bullet로 설명합니다.
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

1. `git status --short`, 최근 커밋, 관련 diff 또는 브랜치 비교를 확인합니다.
2. working tree에 커밋되지 않은 변경이 있으면 먼저 `cm` 규칙으로 atomic commit 후보를 찾습니다.
3. 후보가 명확하고 커밋 준비가 끝났으며 요청된 PR에 속하면 PR draft 전에 stage하고 commit합니다.
4. diff가 미완성으로 보이거나, 관련 없는 사용자 작업을 포함하거나, 커밋 경계가 불명확하거나, 여러 PR로 나누는 편이 좋아 보일 때만 사용자에게 확인합니다.
5. PR unit checklist와 split gate로 하나의 PR인지 여러 PR인지 결정합니다.
6. PR을 열거나 업데이트하기 전에 PR 단위 결정을 기록합니다.
7. PR 제목은 미래의 squash-merge commit subject로 작성합니다.
8. PR 본문은 기본 섹션을 사용하고 오래 남을 `Why` 맥락을 강조합니다.
9. PR을 열기 전에 사용자가 알아야 할 검증 gap이 있으면 따로 보고합니다.
10. 사용자가 도구로 PR을 열거나 업데이트하라고 요청하면, blocker가 없는 한 추가 확인 없이 준비된 제목과 본문으로 실행합니다.
