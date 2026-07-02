---
description: 변경사항을 atomic commit으로 분리
---

# cm

사용자가 `cm`, commit management, commit message drafting, commit splitting, commit preparation 등을 요청할 때 사용합니다.

## 핵심 동작

- 명시적인 `cm` 요청은 커밋 준비가 끝난 변경사항을 stage하고 commit해도 된다는 승인으로 봅니다.
- 커밋 메시지를 만든 뒤 승인만 기다리고 멈추지 않습니다. 명확한 atomic commit 후보는 바로 커밋하고 결과를 보고합니다.
- 현재 브랜치가 `master` 또는 다른 기본 브랜치라면 stage하거나 커밋하기 전에 feature branch를 만들고 전환합니다.
- 커밋 메시지는 영어 Conventional Commits 형식으로 작성합니다.
- 변경사항은 파일 수나 diff 크기가 아니라 atomic commit 경계로 나눕니다.
- 커밋은 squash merge를 준비하는 설명 단위로 봅니다. 명확한 review와 revert 의도는 유지해야 하지만, PR 또는 stacked PR 흐름에서 의존성을 기록한다면 각 커밋이 독립적으로 실행 가능할 필요는 없습니다.
- 합리적인 commit 경계가 둘 이상이면 review하고 설명하기 가장 쉬운 경계를 선택하고 그 선택을 보고합니다. 유효한 경계 중 하나를 고르기 위해 멈춰서 확인받지 않습니다.
- 모든 커밋 메시지 본문에는 `Why:`를 포함합니다.
- 커밋 메시지에는 `What:`이나 `Tests:`를 포함하지 않습니다.
- 검증 결과는 커밋 메시지가 아니라 Claude 응답이나 PR 설명에 따로 보고합니다.
- 사용자가 명시적으로 지시하지 않는 한 사용자 변경사항을 되돌리거나 덮어쓰거나 삭제하지 않습니다.

## 포함 스크립트

- working tree가 단순하지 않아 분리 판단 전에 구조화된 근거가 필요하면 `scripts/inspect-changes.sh`로 read-only git 정보를 수집합니다. 스크립트 출력은 compact status와 diff summary일 뿐, 최종 commit 경계가 아닙니다.
- `bash .codex/skills/cm/scripts/inspect-changes.sh`로 실행합니다.

## Atomic Commit 기준

Atomic commit은 단순히 작은 커밋이 아니라, PR 준비를 위한 하나의 설명 단위로 이해, 리뷰, revert할 수 있는 명확한 의도를 가진 커밋입니다.

Atomic commit이 독립적으로 실행 가능한 가장 작은 상태일 필요는 없습니다. 같은 PR 또는 stacked PR 흐름 안의 뒤따르는 커밋에 의존한다면, 그 의존성이 의도적이고 `Why:` 또는 PR 본문에 드러나며 최종 PR 또는 stack 상태가 검증 경계일 때 허용합니다.

이 기준은 빠른 boundary check로 사용하고, 명확한 commit을 지연시키는 이유로 사용하지 않습니다.

- **단일 의도**: 목적을 한 문장으로 설명할 수 있어야 합니다.
- **주된 커밋 타입**: 주요 변경은 `feat`, `fix`, `refactor`, `test`, `docs`, `chore` 중 하나처럼 자연스럽게 한 타입에 들어가야 합니다. 같은 의도를 돕는 문서, 테스트, 설정, 정리는 함께 둘 수 있습니다.
- **리뷰 가능한 의도**: 리뷰어가 제목, `Why:`, diff, 명시된 PR 또는 stack 의존성을 보고 의도와 영향을 이해할 수 있어야 합니다.
- **revert 가능한 의도**: revert하면 하나의 일관된 변경이 제거되어야 합니다. 의존된 PR 또는 stack의 일부라면 그 의존성을 숨기지 않고 기록합니다.
- **일관된 diff**: 포함된 모든 파일이 같은 문제, 요구사항, 정리에 기여해야 합니다.
- **명시적인 후속 의존성**: 같은 PR 또는 stack의 뒤따르는 커밋이 있어야 실행 가능한 경우, 그 의존성이 의도적이고 드러나야 합니다.
- **유용한 테스트 관계**: 테스트가 같은 의도를 직접 설명하거나 검증하면 코드와 함께 둡니다. 다만 최종 상태가 검증 경계라면 같은 PR 또는 stack의 뒤쪽에 둘 수 있습니다.

후보가 불명확하면 review와 revert 의도를 유지하는 가장 작은 경계를 선택합니다. 나누면서 일시적으로 깨진 중간 상태가 생기더라도 review 또는 stacked PR 경계가 더 명확해진다면 분리를 허용하고 `Why:` 또는 PR 본문에 의존성을 설명합니다. 나누면 작업 이해가 더 어려워지는 경우에는 함께 두고 `Why:`에 경계를 설명합니다.

## 분리 규칙

함께 둡니다:

- 기능 코드와 해당 기능을 직접 검증하는 테스트
- 버그 수정 코드와 회귀 테스트
- 같은 변경에 필요한 타입, 설정, 마이그레이션, lockfile
- 같은 변경을 명확하고 review 가능하게 만드는 작은 refactor, cleanup, 문서

다음 경우에는 분리를 우선합니다:

- 변경의 user-visible 의도가 다른 경우
- review, revert, 설명을 따로 하는 편이 맞는 경우
- dependency, tooling, test-infrastructure 변경이 근처 product 변경 없이도 의미 있는 경우
- 문서나 cleanup이 같은 변경이 아니라 별도 convention 또는 결정을 설명하는 경우

다음 경우에만 커밋 전에 사용자에게 확인합니다:

- diff 일부가 끝나지 않은 사용자 작업처럼 보이는 경우
- working tree에 관련 없는 변경이 섞여 있고 diff만으로 안전하게 stage할 수 없는 경우
- 경계 선택이 요청과 코드에서 추론할 수 없는 product, scope, ownership 결정에 해당하는 경우
- 다음 단계가 사용자 변경사항을 삭제, 덮어쓰기, 또는 위험하게 만들 수 있는 경우

## 커밋 메시지 규칙

제목 형식:

```text
<type>: <imperative summary>
```

예:

```text
feat: add user registration endpoint
fix: reject duplicate registration emails
test(auth): cover refresh token expiry
```

규칙:

- 제목 summary는 imperative verb로 시작합니다.
- 제목 끝에는 마침표를 붙이지 않습니다.
- scope는 명확한 가치가 있을 때만 사용합니다.
- 모든 커밋은 `Why:` 본문을 포함합니다.
- `What:`은 사용하지 않습니다. 제목과 diff가 무엇이 바뀌었는지 보여줘야 합니다.
- `Tests:`는 사용하지 않습니다. 테스트 결과는 Claude 응답이나 PR 설명에 둡니다.

## Why 본문 규칙

`Why:`는 diff만 보고는 알기 어려운 이유를 기록합니다. 단순한 변경이라도 왜 필요한지 최소 한 문장으로 설명합니다.

포함할 내용:

- 변경을 유발한 문제, 요구사항, 실패 사례
- 이 접근을 선택한 이유
- 관련이 있다면 더 단순한 대안을 쓰지 않은 이유
- 중요한 제약, tradeoff, 호환성 고려사항
- 커밋의 의도된 경계
- 리뷰어가 diff만으로 추론하기 어려운 비즈니스, 보안, 운영 맥락

포함하지 않을 내용:

- diff 요약
- 파일별 변경 목록
- 테스트 실행 기록
- 제목을 길게 반복한 설명

예:

```text
fix: reject duplicate registration emails

Why:
Checking before insertion gives the API a stable validation error instead of
exposing a database constraint failure.
```

## 작업 흐름

1. 현재 브랜치, `git status --short`, 관련 diff를 확인합니다. 구조화된 fact pack이 분리를 더 빠르거나 덜 오류 나게 만든다면 `scripts/inspect-changes.sh`를 사용합니다.
2. 현재 브랜치가 `master` 또는 기본 브랜치라면 stage하거나 커밋하기 전에 feature branch를 만들고 전환합니다.
3. working tree 변경사항을 review와 revert 의도를 유지하는 가장 적은 수의 명확한 commit 후보로 나눕니다.
4. atomic checklist는 후보를 빠르게 점검하는 용도로 사용합니다.
5. 후보가 명확하고 커밋 준비가 끝났으면 각 후보를 바로 stage하고 Conventional Commit 제목과 `Why:` 본문으로 커밋합니다.
6. diff가 미완성으로 보이거나, 관련 없는 사용자 작업을 안전하게 분리할 수 없거나, product, scope, ownership 결정이 필요할 때만 사용자에게 확인합니다. 명확한 후보가 같은 PR 또는 stack의 뒤따르는 커밋에 의존한다는 이유만으로 묻지 않습니다.
7. 커밋 후 생성한 커밋 제목과 포함 파일을 보고합니다.
8. 검증 결과는 `Verification`으로 따로 보고합니다.
9. 커밋 준비 중 diff가 바뀌면 다시 분리 기준을 확인합니다.