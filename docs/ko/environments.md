---
title: 실행 환경
applies_to:
  - API 서버, DB, Redis, 임베딩 서버가 실행되는 환경의 구분과 환경 사이의 경계
  - 설정값과 비밀값을 정의하고 앱에 전달하는 방식
read_when:
  - 환경 변수, env 파일, 설정 schema를 추가하거나 바꿀 때
  - 비밀값을 추가하거나 바꾸고, 클러스터에 전달하는 방식을 다룰 때
  - 환경마다 다르게 동작해야 하는 값이나 기능을 만들 때
  - 마이그레이션을 배포하는 시점이나, 이전 코드와 호환되지 않는 스키마 변경을 다룰 때
---

# 실행 환경

## 환경
- 환경은 local, test, production 세 가지임
  - local은 개발자 PC이고 DB는 언제든 버려도 됨
  - test는 자동 테스트 환경이고 DB는 테스트마다 만들고 버림
  - production은 홈 k3s 클러스터의 `sheska` namespace이고 DB는 버리지 않음
- 환경을 더하면 환경마다 namespace를 하나씩 둠. 예: `sheska-staging`
  - 비밀값을 읽는 자격 증명이 namespace로 나뉘어, 한 환경의 Pod가 다른 환경의 비밀값을 읽지 못함

## 설정
- 환경마다 달라질 수 있는 값은 코드에 쓰지 않고 설정값으로 둠. 예: DB 주소, 허용할 출처
  - 코드에 쓴 값은 환경을 옮길 때마다 코드를 고쳐야 하고, local 값이 그대로 배포될 수 있음
- 환경 사이의 차이는 설정값으로만 나타냄. 코드에서 환경 이름으로 분기하지 않음
  - 환경 이름으로 분기한 코드는 production에 올리기 전까지 그 분기가 실행되지 않음
  - `NODE_ENV`도 환경 이름으로 쓰지 않음. `NODE_ENV`는 Node와 라이브러리의 실행 모드임. 환경 이름으로 쓰면 production 모드로 도는 staging을 나타낼 수 없음
- 환경 이름은 텔레메트리, 로그, 화면 표시처럼 환경을 구분해 보여 줄 때만 씀
- 필수 설정값에는 기본값을 두지 않음. 기본값이 local 값이면 production에서 설정을 빠뜨려도 오류 없이 엉뚱한 곳에 연결됨
- 앱은 시작할 때 설정값을 검증하고, 필수 값이 없거나 형식이 틀리면 시작하지 않음
  - 검증하지 않으면 요청을 받다가 그 값을 처음 쓰는 곳에서 실패함
  - 설정 schema의 위치와 배선은 앱 문서가 소유함. 예: [API Runtime Wiring 컨벤션](../../apps/api/docs/ko/architecture/runtime-wiring.md#environment-configuration)
- 접근을 허용하거나 데이터를 지우는 기능은 설정이 없으면 닫힌 쪽으로 동작함. 예: 설정이 없으면 CORS를 모두 거부함

## env 파일
- local과 test의 env 파일은 커밋하고, 다른 환경의 env 파일은 커밋하지 않음
  - local과 test의 DB 비밀번호처럼 그 PC 밖에서 쓸 수 없는 값은 비밀값이 아님
  - 커밋한 env 파일이 있어야 저장소를 받은 직후 바로 앱과 테스트를 실행할 수 있음
- 커밋하는 env 파일 첫머리에는 이 파일이 공개되고 실제 비밀값을 넣지 않는다고 적음
- 어떤 env 파일을 읽을지는 실행 명령(`node --env-file`)이 정함. 앱 코드가 환경 이름으로 파일 경로를 만들지 않음
- 개발 도구의 접속 정보는 앱의 env 파일에 넣지 않음. gitignore된 `.dev-integrations.env`에 둠

## 비밀값
- 비밀값은 DB 비밀번호, API 키처럼 알면 접근할 수 있게 되는 설정값임
- production 비밀값은 저장소에 두지 않고 AWS SSM Parameter Store에 환경마다 다른 경로로 둠. 예: `/sheska/production/`
  - 읽고 바꿀 수 있는 사람은 IAM으로 제한하고, 기록은 CloudTrail에 남음
  - 저장소에는 암호화한 형태로도 두지 않음. SealedSecret은 클러스터 키에 묶여서 클러스터를 다시 만들면 모든 값을 다시 암호화해야 함
- 클러스터는 External Secrets Operator로 비밀값을 Secret으로 가져와 Pod에 파일로 마운트함. 앱은 환경 변수가 아니라 파일에서 읽음
  - 환경 변수는 자식 프로세스에 물려지고 오류 보고와 디버깅 도구가 통째로 기록하기 쉬움
  - 앱은 `DATABASE_URL_FILE`처럼 `_FILE`로 끝나는 환경 변수로 파일 경로를 받음. local과 test는 같은 이름의 환경 변수로 값을 바로 받음
  - 앱이 AWS를 몰라서 local과 클러스터에서 같은 코드로 설정을 읽음
  - AWS에 잠시 연결되지 않아도 이미 가져온 Secret으로 Pod가 뜸
- External Secrets Operator는 ExternalSecret 정의가 바뀔 때만 다시 읽음. 값을 바꾸면 `force-sync` annotation을 바꿔 다시 읽게 함
  - 주기적으로 다시 읽으면 바뀐 값이 사람이 정하지 않은 시점에 Pod로 들어감
  - Postgres는 데이터 디렉터리를 처음 만들 때만 비밀번호 파일을 적용함. DB 비밀번호는 먼저 `ALTER USER`로 바꾸고 Parameter Store를 맞춤
- External Secrets Operator의 AWS 자격 증명은 환경마다 자기 경로의 읽기 권한만 가진 access key 하나임. SealedSecret으로 hash-infra 저장소에 둠
  - 클러스터가 AWS 밖에 있어서 첫 자격 증명은 클러스터 안에 있어야 함. 권한을 좁혀서 새도 그 환경의 비밀값 읽기에 그침
- 같은 비밀값은 Parameter Store에 한 번만 둠. 그 값으로 만드는 다른 값은 External Secrets Operator의 template으로 만듦
  - 예: DB 비밀번호만 두고 `DATABASE_URL`은 template으로 만듦. 두 곳에 두면 한쪽만 바꿨을 때 연결이 끊김
- 비밀이 아닌 값은 Helm values에 둠. 비밀값은 리뷰에서 무엇이 바뀌었는지 보이지 않음
- 환경마다 다른 비밀값을 씀. 한 환경의 비밀값이 새도 다른 환경에 닿지 못해야 함
- 비밀값과 비밀값이 든 설정값(예: 비밀번호가 든 DB 주소)을 로그와 오류 보고에 남기지 않음
- 브라우저와 Obsidian 플러그인에 들어가는 값은 비밀값이 될 수 없음. Vite의 `VITE_` 환경 변수는 정적 번들에 그대로 들어감

## 마이그레이션
- production 마이그레이션은 새 API 서버가 요청을 받기 전에 배포의 한 단계(ArgoCD `PreSync` Job)로 적용함
  - 새 코드가 이전 스키마로 요청을 받으면 없는 테이블과 컬럼을 읽다가 실패함
  - 마이그레이션이 실패하면 sync가 멈추고 이전 버전이 계속 요청을 받음
- 마이그레이션은 롤아웃이 끝날 때까지 요청을 받는 이전 코드와 호환되게 만듦
  - 이전 코드가 쓰는 테이블이나 컬럼을 지우거나 이름을 바꾸면 새 구조 추가, 코드 전환, 이전 구조 삭제를 서로 다른 배포로 나눔
