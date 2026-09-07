---
title: API 로깅 정책
lang: ko
audience: both
applies_to:
  - apps/api
source: ../../en/operability/logging.md
last_synced: 2026-09-07
read_when:
  - 로그를 남길지, 무엇을 남길지, 어디서 남길지, 어떤 레벨로 남길지 결정할 때.
related:
  - ./error.md
  - ./observability.md
  - ../architecture/architecture.md
---

# API 로깅 정책

## 적용 범위

- 애플리케이션 사건을 기록할지, 어디서 기록할지, 어떤 레벨로 기록할지 결정할 때 이 문서를 사용한다.
- 작업을 재구성하거나 결과를 이해하거나 조치 필요성을 판단하는 데 도움이 될 때만 로그를 작성한다.
- 로그 전송, export, trace 연계는 [관측 가능성 컨벤션](./observability.md)을 따른다.

## 로그 종류

- 기록하는 사건에 따라 로그를 분류한다.
  - 장애 로그는 운영 실패와 시스템 오류를 기록한다.
  - 보안 로그는 인증, 인가, 접근 제어 사건을 기록한다.
  - 감사 로그는 특정 행위자에게 귀속되는 중요한 비즈니스 상태 변경을 기록한다.
  - 접근 로그는 인바운드 및 아웃바운드 요청 트래픽을 기록한다.
- 이 문서는 장애 로그 판단만 정의한다.

## 장애 로그 판단

- 로그 여부와 레벨을 선택하기 전에 오류를 분류한다.
  - 오류 소유권과 분류는 [오류 정책](./error.md)을 따른다.
  - 오류 분류는 로그 여부와 레벨을 정하지만 로그 위치는 정하지 않는다.
- 모든 오류를 기계적으로 장애 로그로 만들지 않는다.

### 로그 레벨

- 조사나 조치가 필요한 최종적인 운영 실패 또는 시스템 실패에는 `error`를 사용한다.
- 복구했거나 성능·기능을 저하시켰거나 의도적으로 삼킨 운영상 유의미한 실패에는 `warn`을 사용한다.
- 장애가 아닌 예상된 결과의 유용한 맥락에는 info severity인 `log` 또는 `debug`를 사용한다.
  - 주로 진단에 필요하고 정상 운영 로그에는 지나치게 상세한 맥락이라면 `debug`를 선택한다.

### 오류 분류

- 비즈니스 오류는 예상 가능한 비즈니스 규칙 실패이며 시스템 장애가 아니다.
  - 비즈니스 오류를 `error` 레벨로 기록하지 않는다.
  - `error`로 기록하면 장애 신호가 오염되어 실제 사고를 찾기 어려워진다.
  - 운영상 유용한 맥락은 관찰 가능한 경계에서 `log` 또는 `debug`로 기록한다.
- 외부 오류는 발생 위치가 아니라 의미로 분류한다.
  - Vendor의 비즈니스 규칙에 따른 거절은 시스템 장애가 아니므로 장애 로그가 필요하지 않다.
  - Vendor 또는 연동 시스템 실패는 장애 로그가 필요하다.

## 관찰 가능한 경계

- 오류가 지나가는 모든 레이어가 아니라 **관찰 가능한 경계**에서 한 번만 로그를 남긴다.
  - 관찰 가능한 경계는 오류를 다시 던지지 않고 처리를 끝내는 지점이다.
  - 모든 레이어에서 기록하면 metric과 alert이 중복되고 사고 건수가 왜곡된다.
- **로그하거나 던지거나, 둘 다 하지 않는다.**
  - 다시 던질 때는 로그 없이 맥락을 추가하고 `cause`를 보존한다.

### 최상위 경계

- 전파된 장애는 최종 response 또는 프로세스 결과로 변환하는 최상위 handler에서 기록한다.
  - HTTP runtime에서는 전역 exception filter가 최상위 관찰 가능 경계다.

```typescript
try {
  await db.save(order);
} catch (cause) {
  throw new OrderPersistenceError('Failed to save order', { cause, orderId: order.id });
}
```

### 삼킴 경계

- 오류를 다시 던지지 않는 catch 지점을 관찰 가능한 경계로 본다.
  - 삼킨 실패가 레벨과 분류 규칙에 따라 운영상 유의미할 때만 그 지점에서 기록한다.
  - catch했다는 이유만으로 성공적으로 복구한 일시적 실패를 기록하지 않는다.
  - 삼킨 실패는 더 이상 전파되지 않으므로 나중에 기록할 수 없다.

## 로깅 의존성

- Domain과 application 코드는 구체적인 logger 구현에 의존해서는 안 된다.
- 최상위 경계의 로깅은 middleware, interceptor, 전역 exception handler 또는 process handler가 담당한다.
- Domain 또는 application의 삼킴 경계는 주입받은 로깅 계약을 사용할 수 있다.
  - 계약은 적절한 kernel이 소유하며 `Logger`처럼 기능에 따라 이름을 짓는다.
  - Runtime 또는 platform 배선이 구체적인 구현체를 소유한다.
  - 테스트에서는 계약을 test double로 대체한다.

```typescript
interface Logger {
  warn(message: string, context?: Record<string, unknown>): void;
}

class RetryingNotificationSender {
  constructor(private readonly logger: Logger) {}

  async sendBestEffort(notification: Notification): Promise<void> {
    try {
      await this.retryableSend(notification);
    } catch (cause) {
      this.logger.warn(
        'Notification delivery abandoned after retries',
        { cause, notificationId: notification.id },
      );
    }
  }
}
```
