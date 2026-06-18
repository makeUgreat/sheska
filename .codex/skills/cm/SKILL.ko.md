# cm

이 문서는 개발자가 `cm` skill의 의도와 동작 규칙을 빠르게 이해하기 위한 한국어 참고 문서입니다. Codex가 실제로 사용하는 기준은 같은 디렉터리의 `SKILL.md`이며, 두 문서가 충돌하면 `SKILL.md`를 우선합니다.

## 사용 시점

사용자가 `cm`, commit management, commit message drafting, commit splitting, commit preparation 등을 요청할 때 사용합니다.

## 핵심 동작

- 명시적인 `cm` 요청은 커밋 준비가 끝난 변경사항을 stage하고 commit해도 된다는 승인으로 봅니다.
- 커밋 메시지를 만든 뒤 승인만 기다리고 멈추지 않습니다. 명확한 atomic commit 후보는 바로 커밋하고 결과를 보고합니다.
- 커밋 메시지는 영어 Conventional Commits 형식으로 작성합니다.
- 변경사항은 파일 수나 diff 크기가 아니라 atomic commit 경계로 나눕니다.
- 모든 커밋 메시지 본문에는 `Why:`를 포함합니다.
- 커밋 메시지에는 `What:`이나 `Tests:`를 포함하지 않습니다.
- 검증 결과는 커밋 메시지가 아니라 Codex 응답이나 PR 설명에 따로 보고합니다.
- 사용자가 명시적으로 지시하지 않는 한 사용자 변경사항을 되돌리거나 덮어쓰거나 삭제하지 않습니다.

## Atomic Commit 기준

Atomic commit은 단순히 작은 커밋이 아니라, 하나의 명확한 의도를 갖고 독립적으로 이해, 리뷰, revert할 수 있는 커밋입니다.

각 커밋 후보는 다음 기준을 만족해야 합니다.

- **단일 의도**: 목적을 한 문장으로 설명할 수 있어야 합니다.
- **단일 커밋 타입**: `feat`, `fix`, `refactor`, `test`, `docs`, `chore` 중 하나처럼 자연스럽게 한 타입에 들어가야 합니다.
- **독립 리뷰 가능성**: 리뷰어가 이 커밋만 보고도 의도와 영향을 이해할 수 있어야 합니다.
- **독립 revert 가능성**: revert해도 관련 없는 변경사항이 함께 사라지지 않아야 합니다.
- **일관된 diff**: 포함된 모든 파일이 같은 문제, 요구사항, 정리에 기여해야 합니다.
- **숨은 후속 의존성 없음**: 다음 커밋 없이는 의미 없는 깨진 중간 단계가 아니어야 합니다.
- **직접적인 테스트 관계**: 포함된 테스트는 같은 커밋의 기능, 수정, 리팩터링을 직접 검증해야 합니다.

기준을 통과하지 못하면 더 나눕니다. 나누면 빌드가 깨지거나 리뷰가 더 불명확해지는 경우에는 함께 두고 `Why:`에 경계를 설명합니다.

## 분리 규칙

함께 둡니다.

- 기능 코드와 해당 기능을 직접 검증하는 테스트
- 버그 수정 코드와 회귀 테스트
- 같은 변경에 필요한 타입, 설정, 마이그레이션, lockfile

기본적으로 분리합니다.

- 기능 작업과 리팩터링
- 버그 수정과 주변 정리
- 테스트 인프라 변경과 기능 테스트 추가
- 문서 개선과 동작 변경
- 의존성 업그레이드와 업그레이드된 의존성을 사용하는 기능
- 독립적으로 revert되어야 하는 변경

다음 경우에는 커밋 전에 사용자에게 확인합니다.

- 변경이 자연스럽게 여러 커밋 타입에 걸치는 경우
- revert 경계와 리뷰 경계가 충돌하는 경우
- diff 일부가 끝나지 않은 사용자 작업처럼 보이는 경우
- working tree에 관련 없는 변경이 섞여 있고 커밋 경계가 diff만으로 명확하지 않은 경우

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
- `Tests:`는 사용하지 않습니다. 테스트 결과는 Codex 응답이나 PR 설명에 둡니다.

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

1. `git status --short`와 관련 diff를 확인합니다.
2. working tree 변경사항을 atomic commit 후보로 나눕니다.
3. 각 후보에 atomic checklist를 적용합니다.
4. 후보가 명확하고 커밋 준비가 끝났으면 각 후보를 바로 stage하고 Conventional Commit 제목과 `Why:` 본문으로 커밋합니다.
5. diff가 미완성으로 보이거나, 관련 없는 사용자 작업을 포함하거나, atomic 경계가 불명확할 때만 사용자에게 확인합니다.
6. 커밋 후 생성한 커밋 제목과 포함 파일을 보고합니다.
7. 검증 결과는 `Verification`으로 따로 보고합니다.
8. 커밋 준비 중 diff가 바뀌면 다시 분리 기준을 확인합니다.
