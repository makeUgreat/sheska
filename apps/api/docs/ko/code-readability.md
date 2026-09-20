---
title: API 코드 가독성 컨벤션
applies_to:
  - apps/api
read_when:
  - API 코드의 조건식과 불리언 이름을 작성하거나 검토할 때
---

# API 코드 가독성 컨벤션

## 의미가 있는 조건

- 조건식 자체만으로 제어 흐름에서 사용하는 상태나 판단이 명확하지 않다면, 조건의 의미를 변수 이름으로 드러낸다.
  - `hadListeners`, `hasListeners`, `isValid`처럼 긍정형 불리언 이름을 우선한다.
  - 부정 분기에서는 `hadNoListeners`처럼 이름에 부정을 포함하기보다 긍정형 불리언을 부정해서 사용한다.
  - 조건식만으로 의미가 바로 드러나고 변수가 같은 표현을 반복할 뿐이라면 조건을 그대로 사용한다.

```ts
const hadListeners = listenerResults.length > 0;

if (!hadListeners) {
  throw new Error(`No listener registered for ${event.eventType}`);
}
```
