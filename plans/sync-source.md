# Sync Source

## Source Of Truth

- Source of truth는 외부 저장소다.
- v1 외부 저장소는 로컬 Obsidian vault를 기준으로 한다.
- 추후 다양한 adapter로 확장될 여지는 있으나 v1에서는 고려하지 않는다.

## 용어

- `source`는 Sheska가 저장, 임베딩, 검색 대상으로 다루는 개별 원본 단위다.
- v1에서 `source`는 Obsidian note 하나의 원문 content를 의미한다.
- `sourceId`는 Sheska 내부 source id이며 서버가 UUID v7로 생성한다.
- `externalSourceId`는 외부 저장소 안에서 source를 안정적으로 식별하는 값이며 클라이언트가 관리한다.
- v1은 단일 Obsidian vault를 전제로 하므로 별도 external namespace는 두지 않는다.

## 동기화 방향

- 동기화는 외부 저장소에서 Sheska로 이어지는 단방향이다.
- Sheska는 외부 저장소의 내용을 반영하는 쪽이며, 외부 저장소를 수정하지 않는다.

## 동기화 방법 및 주기

- Sheska는 source 원문을 받는 push upload API를 제공한다.
- 클라이언트는 source of truth 역할을 하며, 변경된 source 원문과 삭제 정보를 Sheska upload API로 전달한다.
- Source upload payload는 최소한 `externalSourceId`, `content`를 포함한다.
- 삭제 정보는 `externalSourceId` 기준으로 전달한다.
- 완료된 비동기 동작을 클라이언트에게 전달하는 방법은 추후 고려한다.

## Upload API Use Case

- 후보 이름은 `UploadSourceUseCase`다.
- Upload API의 동기 처리 범위는 source 원문 저장과 후속 job 생성까지다.
- 임베딩 생성과 검색 index 반영은 queue worker가 처리하며 Upload API 응답 범위에 포함하지 않는다.

입력:

- `externalSourceId`
- `content`

흐름:

1. Presentation layer는 transport payload를 검증하고 application command로 변환한다.
2. Application service는 전달받은 `content` 기준으로 `contentHash`와 `size`를 계산한다.
3. Repository는 `externalSourceId` 기준으로 기존 source를 조회한다.
4. 기존 source가 없으면 서버가 UUID v7 `sourceId`를 생성하고 새 source를 저장한다.
5. 기존 source가 있고 서버가 계산한 `contentHash`가 같으면 저장 갱신과 후속 job 생성을 건너뛴다.
6. 기존 source가 있고 서버가 계산한 `contentHash`가 다르면 source content와 hash를 갱신한다.
7. source가 새로 생성되거나 변경되면 source 저장과 후속 job 생성을 같은 durable boundary 안에서 처리한다.
8. API는 처리 결과를 반환하되, 후속 job 완료는 보장하지 않는다.

출력:

- `sourceId`
- `externalSourceId`
- `contentHash`
- `status`: `created`, `updated`, `skipped`
- `syncJobId`: 후속 job이 생성된 경우에만 포함한다.

실패 처리:

- request validation 실패는 job 없이 즉시 실패한다.
- source 저장 또는 후속 job 생성 실패는 upload 실패로 처리한다.
- worker 처리 실패는 upload 실패가 아니라 비동기 job 실패로 기록한다.

## 비동기 처리

- Upload API는 요청을 받은 뒤 동기화 작업을 비동기로 처리한다.
- source 원문은 먼저 DB나 object storage 같은 저장소에 기록한다.
- 메시지 브로커 queue에는 source 원문을 직접 넣지 않고 `syncJobId` 또는 `sourceId` 같은 참조만 전달한다.
- 임베딩 처리는 시간이 걸릴 수 있으므로 queue worker가 후속 처리한다.

## 동기화 로직 고려사항

- 동기화 처리는 멱등적이어야 한다.
- 기본 멱등성 기준은 `externalSourceId + contentHash`다.
- 저장소는 `externalSourceId`에 unique constraint를 두어 외부 source 매핑을 보장한다.
- `contentHash`와 `size`는 서버가 upload payload의 `content` 기준으로 계산한다.
- 클라이언트가 hash를 보내더라도 서버는 이를 신뢰하지 않고 최적화용 참고값으로만 다룬다.
- 기존 source의 `contentHash`가 서버가 계산한 `contentHash`와 같으면 저장 갱신과 임베딩 재처리를 건너뛴다.
- upsert를 지원하는 DB를 이용할 수 있다면 활용하여 동시성 문제를 완화한다.

## 비동기 실패 정책

- v1은 worker 처리 실패를 즉시 failed job으로 기록하고 자동 재시도하지 않는다.
- 실패한 job의 자동 재시도, backoff, 재처리 명령은 추후 필요해질 때 추가한다.
- 최종 실패 시 로그(당장은 console)를 기록한다.

## 충돌 정책

- 외부 저장소를 우선한다.
- Sheska 내부에서 source 원문을 직접 수정할 수 있는 기능은 v1에서 제공하지 않는 것을 기본으로 한다.
