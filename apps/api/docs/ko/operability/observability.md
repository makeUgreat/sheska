---
title: API 옵저버빌리티 컨벤션
applies_to:
  - apps/api
read_when:
  - OpenTelemetry 계측, exporter, 리소스 속성, 시작 순서를 바꿀 때
related:
  - ./error.md
---

# API 옵저버빌리티 컨벤션

## 전송
- API는 trace, log, metric을 모두 OTLP로 공용 Alloy에 push함
  - 클러스터의 수집기는 VPN 너머의 로컬 프로세스에 닿지 못함. 방식이 하나면 운영과 개발의 코드 경로가 같음

## 소유 경계
- 이 저장소는 계측, OTel 설정, 리소스 속성을 소유함. Alloy, backend, dashboard, label 승격은 `hash-infra`가 소유함
- 리소스 속성을 label로 일괄 승격하지 않음. 카디널리티가 높은 속성까지 승격됨

## 리소스 속성
- service name은 코드에 둠. 배포마다 바뀌지 않음
- 환경 이름은 `OTEL_RESOURCE_ATTRIBUTES`로 받고, endpoint가 있는데 없으면 시작하지 않음
  - backend를 여러 환경이 공유해서 환경 이름 없는 telemetry는 구분할 수 없음

## 시작 순서
- OTel bootstrap은 `main.ts`의 첫 import여야 함. 먼저 로드된 모듈은 계측되지 않음
- bootstrap을 NestJS provider로 만들지 않음. NestJS보다 먼저 실행되어야 함

## 로그 통합
- pino에 trace 상관관계나 OTel 전송을 직접 붙이지 않음. instrumentation이 이미 함
