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
- 시작과 runtime 배선은 `platform`이 소유하고, `platform`은 비즈니스 규칙을 담지 않음
- `main.ts` 말고는 `platform`을 import하지 않음. 배선이 기능 코드로 새지 않게 함

## Environment Configuration
- 설정은 묶음마다 `registerAs`로 정의하고 `KEY` token으로 주입받음. `ConfigService.get`을 쓰지 않음
  - 문자열 키는 오타와 타입을 컴파일러가 잡지 못함
- 묶음은 자기 factory에서 환경 변수를 검증함. 묶음 밖의 코드는 `process.env`를 읽지 않음
- 묶음의 schema는 배포하는 쪽과의 계약임. 환경 변수마다 JSDoc으로 뜻과 비밀값 여부를 적음
- 묶음은 그 설정을 쓰는 경계가 소유하고 쓰는 코드 옆에 둠
- 여러 루트 모듈이 import하는 모듈은 자기 묶음을 `forFeature`로 등록함. 루트마다 반복하면 한 곳을 빠뜨리기 쉬움
  - `forFeature`는 import마다 factory를 다시 실행하므로, 비밀값 파일을 읽는 묶음은 한 경로로만 import되는 모듈에서 등록함
- Nest 밖의 진입점은 묶음의 factory를 직접 호출해 같은 검증을 거침
- 비밀값은 `X`나 `X_FILE` 중 하나로 받고, 둘 다 있으면 시작하지 않음. 파일에서 읽은 값을 `process.env`에 다시 넣지 않음
- adapter 전용 환경 변수는 그 adapter를 고른 경우에만 필수로 둠

## NestJS DI
- `core`, domain, kernel은 framework와 무관하게 둠
- application은 생성자 주입 metadata까지만 씀. use case는 명시적인 의존성만으로 만들어지는 일반 클래스임
- 모듈은 use case 단위가 아니라 bounded context나 runtime 경계 단위로 조립함

### 동적 모듈
- NestJS는 import 경로가 다른 동적 모듈을 중복 제거하지 않음. 그래서 listener, consumer, controller는 `forRoot()`에만 둠
- `forFeature()`에는 여러 번 만들어도 안전한 stateless provider만 둠
- provider를 `forFeature()`에 넣을지는 지금 쓰는 곳이 아니라 stateless인지로 정함
- `forRoot()`는 조립을 소유하는 모듈에서 한 번만 import함

### Adapter 생성
- adapter는 조립하는 모듈이 설정을 생성자로 넘겨 만듦. adapter가 `ConfigService`나 `process.env`를 직접 읽지 않음
- 조정 가능한 생성자 매개변수에는 기본값을 두지 않음
