---
title: API 로깅 정책
lang: ko
audience: both
applies_to:
  - apps/api
source: ../en/logging.md
last_synced: 2026-07-10
read_when:
  - 로그를 남길지, 무엇을 남길지, 어디서 남길지, 어떤 레벨로 남길지 결정할 때.
related:
  - ./error.md
  - ./architecture.md
---

# API 로깅 정책

로그는 애플리케이션이 실행되는 동안 발생한 중요한 사건을 나중에 확인할 수 있도록 남겨두는 기록이다.

## 목적

로그 기록은 나중에 아래 질문 중 하나 이상에 답할 수 있을 때 작성한다:

- 언제 발생했는가?
- 어디서 발생했는가?
- 무슨 일이 발생했는가?
- 어떤 요청이나 작업과 관련이 있는가?
- 시스템이 어떻게 처리했는가?
- 운영자가 조치해야 하는가?

## 로그 종류

로그는 성격에 따라 구분하며 종류마다 정책이 다를 수 있다:

- **장애 로그**: 관심이 필요한 운영 실패와 시스템 에러.
- **보안 로그**: 인증, 인가, 접근 제어 이벤트.
- **감사 로그**: 특정 행위자로 추적 가능한 비즈니스적으로 중요한 상태 변경.
- **접근 로그**: 인바운드 및 아웃바운드 요청 트래픽 기록.

이 문서의 나머지 부분은 **장애 로그**, 그중에서도 에러 발생 시의 로깅 판단에 집중한다. 보안·감사·접근 로그의 기록 시점과 형식은 별도 정책을 따른다 (TBD — 필요 시 이 문서에 절을 추가한다).

## 에러 발생 시 장애 로그를 남기는 시점

에러가 발생했다고 해서 항상 장애 로그를 남기는 것은 아니다. 기계적인 "에러 → 로그" 흐름은 안티패턴이다.

에러를 분류한 뒤 로그 여부와 레벨을 결정한다. 아래 분류는 **로그를 남길지·어떤 레벨로 남길지**를 정할 뿐, **어디서** 남길지는 정하지 않는다 — 위치는 뒤의 [관찰 가능한 경계](#관찰-가능한-경계) 절을 따른다.

### 비즈니스 에러

비즈니스 에러는 비즈니스 규칙을 만족하지 못해 발생한 예상 가능한 실패다. 장애가 아니다.

예시:
- 잔액 부족
- 쿠폰 사용 조건 불만족
- 이미 취소된 주문
- 예약 가능한 시간이 아님

비즈니스 에러에 장애 로그(error 레벨)를 남기지 않는다. 그렇게 하면 장애 신호가 오염되고 실제 장애를 찾기 어려워진다. 입력 맥락이 운영상 유용하다면 낮은 레벨(info/debug)로 기록하되, 다른 에러와 마찬가지로 관찰 가능한 경계에서 기록한다 — 발생 지점에서 즉시 기록하지 않는다.

### 외부 에러

외부 에러는 애플리케이션 바깥에서 발생하며 그 성격이 다양하다. 로그 결정은 에러의 성격에 따라 달라진다:

- **Vendor 비즈니스 규칙에 따른 거절**: vendor가 자체 비즈니스 규칙에 따라 요청을 거절한 경우다. 시스템 장애가 아니므로 장애 로그를 남기지 않는다.
- **시스템 실패**: vendor 시스템 또는 연동 구간 자체의 실패다. 장애 로그를 남긴다.

## 관찰 가능한 경계

에러가 지나치는 모든 레이어가 아니라 **관찰 가능한 경계**에서 한 번만 로그를 남긴다.

**이유**: 각 레이어에서 로그를 남기는 방식(log-and-throw 안티패턴)은 하나의 사건에서 N개의 로그를 만든다. 이는 메트릭을 부풀리고 알림을 중복 발생시키며 장애 건수를 잘못 집계한다.

**정의**: 경계란 에러가 더 이상 rethrow되지 않고 최종적으로 처리가 확정되는 지점이다. "관찰 가능한"이란 우리 애플리케이션이 알 수 있는 범위를 의미한다. 이 정의를 만족하는 지점은 두 가지 형태로 나타난다.

### 유형 1 — 최상위 경계 (일반적인 경우)

에러가 계속 rethrow되어 결국 애플리케이션 최상단까지 전파되는 경우다. 웹 서버에서는 보통 전역 exception filter가 이 역할을 한다.

```
PaymentService → PaymentVendorClient → HttpClient
```

`HttpClient`에서 timeout이 발생하면 `PaymentVendorClient`가 `VendorTimeoutError`로 감싸고, `PaymentService`가 다시 `PaymentFailedError`로 감쌀 수 있다. 각 지점에서 로그를 남기면 하나의 사건에서 세 개의 로그가 생긴다. 대신 전역 exception filter에서 한 번만 남긴다.

**로그하거나 던지거나 — 둘 다 하지 않는다.** 에러를 rethrow할 것이라면 로그를 남기지 않는다. 맥락을 에러에 실어서 던진다.

```typescript
try {
  await db.save(order);
} catch (cause) {
  // 여기서 로그를 남기지 않는다. 맥락을 담아 rethrow한다.
  throw new OrderPersistenceError('Failed to save order', { cause, orderId: order.id });
}
```

### 유형 2 — 삼킴 경계 (예외적인 경우)

레이어가 에러를 잡고 rethrow하지 않는 경우 — 의도적으로 무시하는 치명적이지 않은 실패, 또는 이후 재시도가 성공한 재시도 루프 등 — 이다. 정의상 이 지점도 "rethrow되지 않고 최종 처리가 확정되는 곳"이므로 관찰 가능한 경계에 해당한다. 에러가 더 이상 전파되지 않으므로 **이 지점이 관측 가능하게 만들 수 있는 유일한 기회**이며, 여기서 로그를 남기지 않으면 그 사건은 기록에서 영구히 사라진다.

삼킴 경계는 유형 1과 달리 domain이나 application 레이어 내부에 위치하는 경우가 많다. 이때의 로깅 방법은 아래 [관심사 분리](#관심사-분리) 절을 따른다.

## 관심사 분리

Domain과 application 코드는 구체적인 logger 구현에 의존하지 않는다. Logging은 횡단 관심사다.

- 에러를 rethrow하는 코드는 맥락을 담은 typed error를 throw할 뿐, 로그를 남기지 않는다.
- 최상위 경계(유형 1)의 로깅은 middleware, interceptor, 전역 exception handler가 전담한다.
- 삼킴 경계(유형 2)가 domain/application 레이어 내부에 있는 경우, 해당 레이어는 구체적인 logger 대신 **추상화된 로깅 포트**(인터페이스)를 주입받아 사용한다. 구현체는 인프라 계층이 소유하며, domain 코드는 테스트 시 이 포트를 mock으로 교체한다.

```typescript
interface LoggingPort {
  warn(context: Record<string, unknown>, message: string): void;
}

class RetryingNotificationSender {
  constructor(private readonly logging: LoggingPort) {}

  async sendBestEffort(notification: Notification): Promise<void> {
    try {
      await this.retryableSend(notification);
    } catch (cause) {
      // 삼킴 경계: 더 이상 전파되지 않으므로 여기서 관측 기회를 확보한다.
      this.logging.warn(
        { cause, notificationId: notification.id },
        'Notification delivery abandoned after retries',
      );
    }
  }
}
```

이를 통해 domain 코드의 순수성과 테스트 용이성을 유지하면서, 삼킴 경계에서 발생하는 에러가 관측 불가능한 채로 사라지는 것을 막는다.