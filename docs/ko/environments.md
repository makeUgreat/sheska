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

- 환경은 local, test, production 세 가지다.
  - local: 개발자가 자기 PC에서 개발하는 환경이다. DB는 언제든 버려도 된다.
  - test: 자동 테스트가 실행되는 환경이다. DB는 테스트를 위해 만들고 버린다.
  - production: 실제로 쓰는 환경이다. 홈 k3s 클러스터의 `sheska` namespace에서 실행한다. DB는 버리지 않는다.
- 환경을 추가하면 환경마다 namespace를 하나씩 둔다. 예: `sheska-staging`
  - Secret과 비밀값을 읽는 자격 증명이 namespace 단위로 나뉘어, 한 환경의 Pod가 다른 환경의 비밀값을 읽지 못한다.

## 설정

- 이 절은 [The Twelve-Factor App의 Config](https://12factor.net/config)를 따른다.
  비밀값은 따르지 않고 비밀값 절의 규칙을 따른다.
- 환경마다 달라질 수 있는 값은 코드에 쓰지 않고 설정값으로 둔다. 예: DB 주소, 허용할 출처, 외부 서비스 주소
  - 코드에 쓴 값은 환경을 옮길 때마다 코드를 고쳐야 하고, local의 값이 그대로 배포될 수 있다.
- 환경 사이의 차이는 설정값으로만 표현한다. 코드에서 환경 이름으로 분기하지 않는다.
  - 환경 이름으로 분기한 코드는 production에 올리기 전까지 그 분기가 실행되지 않는다.
  - 다르게 동작해야 하는 것마다 설정값을 하나씩 두면 환경을 늘려도 코드를 고치지 않는다.
  - `NODE_ENV`도 환경 이름으로 쓰지 않는다. `NODE_ENV`는 Node와 라이브러리의 실행 모드를 정하는 값이다.
    - 환경 이름으로 쓰면 staging처럼 production 모드로 실행하지만 production이 아닌 환경을 표현할 수 없다.
- 환경 이름이 필요하면 텔레메트리, 로그, 화면 표시처럼 환경을 구분해 보여 주는 데만 쓴다.
- 필수 설정값에는 기본값을 두지 않는다.
  - 기본값이 local의 값이면 production에서 설정을 빠뜨렸을 때 오류 없이 엉뚱한 곳에 연결된다.
- 앱이 시작할 때 설정값을 검증한다. 필수 설정값이 없거나 형식이 틀리면 앱이 시작하지 않는다.
  - 설정값은 문자열로만 들어와서 형식이 틀려도 읽는 순간에는 드러나지 않는다.
    시작할 때 막지 않으면 요청을 받다가 그 값을 처음 쓰는 곳에서 실패한다.
  - 설정 schema를 어디에 두고 어떻게 앱에 배선하는지는 앱 문서가 소유한다.
    예: [API Runtime Wiring 컨벤션](../../apps/api/docs/ko/architecture/runtime-wiring.md#environment-configuration)
- 접근을 허용하거나 데이터를 지우는 기능은 설정하지 않으면 닫힌 쪽으로 동작한다. 예: 설정이 없으면 CORS를 모두 거부한다.
  - 설정을 빠뜨렸을 때 위험한 쪽이 아니라 안전한 쪽으로 동작해야 한다.

## env 파일

- local과 test의 env 파일은 저장소에 커밋하고, 다른 환경의 env 파일은 커밋하지 않는다.
  - local과 test의 DB 비밀번호처럼 그 PC 밖에서 쓸 수 없는 값은 비밀값으로 다루지 않는다.
  - 커밋한 env 파일이 있어야 저장소를 받은 직후 같은 설정으로 앱과 테스트를 실행할 수 있다.
- 커밋하는 env 파일의 첫머리에는 이 파일이 커밋된다는 것과 실제 비밀값을 넣지 않는다는 것을 적는다.
  - env 파일을 열어 값을 고치는 사람이 그 파일이 공개된다는 것을 알아야 한다.
- 어떤 env 파일을 읽을지는 실행 명령이 정한다. 앱 코드가 환경 이름으로 파일 경로를 만들지 않는다.
  - 예: package script의 `node --env-file .env.development`
  - 클러스터에서는 env 파일 없이 Pod의 환경 변수와 마운트한 파일로 설정을 받는다.
- 개발 도구가 쓰는 접속 정보는 앱의 env 파일에 넣지 않는다. [개발 통합 도구](./dev-integrations.md)의 규칙을 따른다.

## 비밀값

- 비밀값은 DB 비밀번호, API 키처럼 알게 되면 접근할 수 있게 되는 설정값이다.
- production의 비밀값은 저장소에 두지 않고 AWS SSM Parameter Store에 환경마다 다른 경로로 둔다.
  예: `/sheska/production/`
  - 누가 비밀값을 읽고 바꿀 수 있는지는 IAM 정책으로 제한하고, 읽고 바꾼 기록은 CloudTrail에 남는다.
  - sheska 저장소에는 비밀값이 암호화된 형태로도 들어가지 않는다.
    - SealedSecret은 클러스터의 sealed-secrets 키에 묶여서, 클러스터를 다시 만들면 모든 값을 다시 암호화해야 한다.
- 클러스터는 External Secrets Operator로 Parameter Store의 비밀값을 Kubernetes Secret으로 가져와 Pod에 파일로 마운트한다.
  앱은 비밀값을 환경 변수가 아니라 이 파일에서 읽는다.
  - 환경 변수는 자식 프로세스에 물려지고, 오류 보고와 디버깅 도구가 통째로 기록하기 쉽다.
  - 앱은 `DATABASE_URL_FILE`처럼 이름 끝에 `_FILE`을 붙인 환경 변수로 파일 경로를 받는다.
    local과 test는 같은 이름의 환경 변수로 값을 직접 받는다.
    - 앱이 AWS를 알지 않아서 local과 클러스터에서 같은 코드로 설정을 읽는다.
    - 두 환경 변수가 함께 있으면 어느 값을 쓸지 모호하므로 앱이 시작하지 않는다.
  - AWS에 잠시 연결되지 않아도 이미 가져온 Secret으로 Pod가 뜬다.
- External Secrets Operator는 ExternalSecret의 정의가 바뀔 때만 Parameter Store를 다시 읽는다(`refreshPolicy: OnChange`).
  Parameter Store의 값을 바꾸면 ExternalSecret의 `force-sync` annotation을 바꿔 다시 읽게 한다.
  - 주기적으로 다시 읽으면 바뀐 값이 사람이 정하지 않은 시점에 Pod로 들어간다.
  - Postgres는 데이터 디렉터리를 처음 만들 때만 `POSTGRES_PASSWORD_FILE`을 적용한다.
    DB 비밀번호를 바꿀 때는 DB 안의 비밀번호를 먼저 `ALTER USER`로 바꾸고 Parameter Store를 맞춘다.
- External Secrets Operator가 Parameter Store를 읽는 AWS 자격 증명은 환경마다 IAM 사용자의 access key 하나다.
  자기 환경 경로의 읽기 권한만 주고, SealedSecret으로 암호화해 hash-infra 저장소에 둔다.
  - 클러스터가 AWS 밖에 있어서 처음 하나의 자격 증명은 클러스터 안에 두어야 한다.
    권한을 좁혀서 새더라도 그 환경의 비밀값 읽기에 그치게 한다.
- 같은 비밀값은 Parameter Store에 한 번만 둔다. 비밀값으로 만드는 다른 값은 External Secrets Operator의 template으로 만든다.
  - 예: DB 비밀번호만 두고 `DATABASE_URL`은 template에서 만든다. Postgres와 API가 같은 비밀번호를 읽는다.
  - 같은 값을 두 곳에 두면 한쪽만 바꿨을 때 서로 연결하지 못한다.
- 비밀이 아닌 값은 비밀값에 넣지 않고 Helm values에 둔다. 예: DB 이름, DB 사용자 이름, 비밀번호가 없는 Redis 주소
  - 비밀값은 리뷰에서 무엇이 바뀌었는지 보이지 않는다.
- 환경마다 다른 비밀값을 쓴다.
  - 한 환경의 비밀값이나 자격 증명이 새도 다른 환경에 접근할 수 없어야 한다.
- 비밀값을 로그와 오류 보고에 남기지 않는다. 비밀값이 들어간 설정값도 마찬가지다. 예: 비밀번호가 들어간 DB 주소
- 브라우저와 Obsidian 플러그인에 들어가는 값은 비밀값이 될 수 없다.
  - Vite의 `VITE_` 환경 변수는 빌드할 때 정적 번들에 그대로 들어가서 누구나 읽을 수 있다.
    UI 빌드 설정은 [UI 배포](../../apps/ui/docs/ko/deployment.md)를 따른다.

## 마이그레이션

- production 마이그레이션은 새 버전의 API 서버가 요청을 받기 전에 배포의 한 단계로 적용한다.
  ArgoCD `PreSync` hook의 Job이 새 이미지로 실행한다.
  - 새 코드가 이전 스키마로 요청을 받으면 아직 없는 테이블과 컬럼을 읽다가 실패한다.
  - 마이그레이션이 실패하면 sync가 멈추고 이전 버전이 계속 요청을 받는다.
- 마이그레이션은 롤아웃이 끝날 때까지 요청을 받는 이전 버전의 코드와 호환되게 만든다.
  - 마이그레이션 뒤의 롤링 업데이트 동안 이전 코드가 새 스키마로 요청을 받는다.
  - 이전 코드가 쓰는 테이블이나 컬럼을 지우거나 이름을 바꿀 때는 새 구조 추가, 코드 전환, 이전 구조 삭제를 다른 배포로 나눈다.
