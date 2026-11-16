---
title: API Runtime Wiring 컨벤션
applies_to:
  - apps/api
read_when:
  - provider, module, 설정 묶음, 비밀값을 추가하거나 배선을 바꿀 때
  - dependency-cruiser 위반 메시지가 이 문서를 가리킬 때
related:
  - ./source-dependency.md
  - ../../../../../docs/ko/environments.md
---

# API Runtime Wiring 컨벤션

## Platform
- `src/main.ts`는 얇은 진입점으로 둠. 시작과 runtime 배선은 `platform`이 소유함
- `platform`은 비즈니스 규칙을 담지 않음
- `src/main.ts` 말고는 production 코드가 `platform`을 import하지 않음. 배선이 기능 코드 쪽으로 새지 않게 함

## Environment Configuration
- env 파일, 비밀값 전달, 환경 이름으로 분기하지 않는 규칙은 [실행 환경](../../../../../docs/ko/environments.md)을 따름. 이 섹션은 API 안의 소유와 배선만 다룸
- 설정은 묶음마다 `registerAs`로 정의하고 묶음의 `KEY` token으로 주입받음. `ConfigService.get`으로 꺼내지 않음
  - 문자열 키로 꺼내면 오타와 타입을 컴파일러가 잡지 못하고, 모듈이 어떤 설정에 기대는지 드러나지 않음
- 묶음은 자기 factory에서 `process.env`를 zod schema로 검증함. 묶음 밖의 production 코드는 `process.env`를 읽지 않음
- 묶음의 schema는 앱과 배포하는 쪽 사이의 계약임. 환경 변수마다 JSDoc으로 뜻과 형식을 적고, 비밀값이면 비밀값이라고 적음
  - env 파일과 Helm values를 쓰는 사람이 코드를 따라가지 않고 schema만 보고 값을 채울 수 있어야 함
- 묶음은 그 설정을 쓰는 경계가 소유하고 쓰는 코드 옆에 `*.config.ts`로 둠. 앱 전체가 쓰면 `platform`, 한 adapter만 쓰면 그 adapter 디렉터리임
- 묶음은 `AppModule`의 `ConfigModule.forRoot({ load })`에 등록함
  - 여러 루트 모듈(API 서버, 마이그레이션 Job)이 import하는 모듈은 자기 묶음을 `ConfigModule.forFeature`로 등록함. 루트마다 `load`에 반복하면 한 곳을 빠뜨린 루트에서만 주입이 실패함
  - `forFeature`는 import될 때마다 factory를 다시 실행함. 비밀값 파일을 읽는 묶음은 여러 경로로 import되지 않는 모듈에서 등록함
- Nest 밖에서 실행되는 진입점(OTel bootstrap, 마이그레이션 스크립트)은 묶음의 factory를 직접 호출함. 그래서 Nest 안과 밖이 같은 검증을 거침
- 비밀값은 `X`나 `X_FILE` 중 하나로 받음. 둘 다 있으면 시작하지 않음
  - 클러스터는 비밀값을 파일로 마운트하고, local과 test는 env 파일로 넣음
  - 둘 다 있으면 어느 값을 쓰는지 배포 설정만 보고 알 수 없음
  - 파일에서 읽은 값을 `process.env`에 다시 넣지 않음. 넣으면 비밀값을 환경 변수로 두지 않으려고 파일을 쓴 이유가 사라짐
- adapter를 환경 변수로 고를 때, adapter 전용 환경 변수는 그 adapter를 고른 경우에만 필수로 둠. 이름은 adapter 이름으로 시작함
  - 항상 필수면 다른 adapter를 쓰는 환경에도 가짜 값이 필요함. 항상 선택이면 빠진 값이 시작이 아니라 처음 쓸 때 드러남

## NestJS DI
- `core`, domain, kernel은 framework와 무관하게 둠
- application은 생성자 주입을 설명하는 metadata(`@Injectable()`, `@Inject()`, provider token)까지만 씀
  - use case는 명시적인 의존성만으로 만들어지는 일반 클래스로 둠. request 객체, module reference, lifecycle callback에 기대면 선을 넘은 것임
- provider 등록과 모듈 조립은 `platform/nest`나 bounded context 루트 모듈에서 함. use case 폴더마다 모듈을 만들지 않음
- adapter는 framework의 생성자 주입으로 만드는 것이 기본임. 손으로 짠 factory는 DI 없이 테스트하거나 runtime 밖에서 재사용할 이유가 있을 때만 씀

### 동적 모듈
- NestJS는 import 경로가 다른 동적 모듈을 중복 제거하지 않음. `forRoot()`에 여러 경로로 닿으면 listener, consumer, controller가 중복 등록됨
- 그래서 `forRoot()`와 `forFeature()`의 책임을 나눔
  - listener, queue consumer, scheduler, controller는 `forRoot()`에만 둠
  - `forFeature()`에는 여러 번 만들어도 안전한 stateless provider만 둠. 예: token, repository
  - `forRoot()`는 조립을 소유하는 모듈에서 한 번만 import함. provider만 필요한 모듈은 `forFeature()`를 import함
- provider를 `forFeature()`에 넣을지는 지금 쓰는 곳이 아니라 stateless인지로 정함. 지금 쓰지 않는다는 이유로 빼지 않음
  - consumer마다 겹치지 않는 provider가 필요하면 호출하는 쪽이 고르게 함. 예: `forFeature(tokens)`

### Adapter 생성
- adapter를 조립하는 모듈이 생성을 소유함. adapter는 설정 묶음이나 options 객체를 생성자로 받음
  - adapter 클래스에 `ConfigService`를 주입하지 않고 `process.env`를 읽지 않음
- 조정 가능한 설정을 뜻하는 생성자 매개변수에는 기본값을 두지 않음. 조립하는 모듈이 값을 명시적으로 넘김
