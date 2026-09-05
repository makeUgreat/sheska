---
title: "ADR 0001: 소스 자동 동기화를 위한 로컬 mtime 캐시"
lang: ko
audience: both
applies_to:
  - apps/obsidian-plugin
source: ../../en/adr/0001-source-sync-local-cache.md
last_synced: 2026-09-05
related:
  - ../index.md
---

# ADR 0001: 소스 자동 동기화를 위한 로컬 mtime 캐시

## Status

Accepted

## Context

- 플러그인은 `main.ts`의 현재 수동 커맨드만 있는 상태에서 벗어나, vault 노트를 `POST /sources`로 자동 업로드하려 한다.
- 계획된 트리거 모델은 하이브리드다.
  - 즉시성을 위한 vault `modify`/`create` 이벤트(디바운스).
  - 앱이 꺼져 있던 동안 놓친 변경을 잡기 위한 주기적 전체 스윕.
- 서버의 no-op 판단은 업로드 비용을 막기엔 너무 늦게 일어난다.
  - `UploadSourceUseCase`는 content fingerprint 기준으로 중복을 제거해 변경 없는 업로드를 no-op 처리한다.
  - 하지만 `SourceContentSnapshotCalculator.calculate`가 no-op 분기보다 먼저 실행되며, 이때 요청 본문 전체를 해시한다.
  - 즉 클라이언트 쪽 필터링이 없으면, 스윕마다 대상 노트 전체 본문을 변경 여부와 무관하게 매번 다시 업로드한다.
  - 이 비용은 실제 편집 빈도가 아니라 "vault 크기 × 스윕 주기"에 비례해 커진다.
- 서버 쪽 배치 diff 엔드포인트(클라이언트가 가벼운 `{path, hash}` 목록을 보내고 서버가 변경된 것만 알려주는 방식)를 대안으로 검토했다.
  - 기각: sync policy가 v1 범위에서 신규 서버 배치 엔드포인트를 이미 배제한 것과 같은 이유 — 신뢰된 클라이언트가 하나뿐인 개인 단일 사용자 배포라, 서버 표면을 늘릴 근거가 아직 없다.
- `TFile.stat.mtime`은 읽는 데 비용이 없고 항상 최신이다.
  - Obsidian 자체의 vault 파일 감시자가 디스크 상의 content 변경(에디터 내부든 외부 도구든)을 감지하면 자동으로 갱신한다.
  - `modify`/`create` vault 이벤트를 발생시키는 신호와 동일하다 — 별도 polling이 필요 없다.
  - 읽는 데 디스크 I/O가 들지 않는다 — Obsidian이 이미 메모리 내 vault 인덱스에 들고 있는 값이다.

## Decision

- vault 상대 경로(=`externalSourceId`로 쓰이는 값과 동일)를 키로 하는 로컬 동기화 캐시를 둔다.

  ```ts
  interface SyncCacheEntry {
    mtime: number;   // 업로드 시점이 아니라 content를 읽는 시점에 캡처
    syncedAt: number;
  }
  type SyncCache = Record<string, SyncCacheEntry>;
  ```

- 플러그인이 이미 쓰고 있는 `loadData()`/`saveData()` 메커니즘으로 저장하되, `SheskaSettings`와는 별도 키로 분리한다.
  - 이유: `saveSettings()`는 저장할 때마다 헬스체크 interval을 재시작하는 부수효과가 있는데, 캐시 쓰기는 이보다 훨씬 자주 일어나므로 같은 경로를 공유하면 안 된다.
- 파일을 업로드하기 전(이벤트 경로든 스윕 경로든)에 `file.stat.mtime`을 캐시된 값과 비교한다.
  - 캐시 항목이 없거나 mtime이 다르면 → 업로드 대상.
  - mtime이 같으면 → 건너뛴다. 이 경우 HTTP 요청 자체를 보내지 않는다.
- 캐시에 기록하는 mtime은 네트워크 호출 전, content를 읽는 시점에 캡처한 값이어야 한다 — 응답을 받은 뒤 다시 읽은 값이면 안 된다.
  - 이유: 업로드가 진행되는 동안 더 최신 수정이 발생하면, 응답 이후 시점의 `stat.mtime`을 그대로 캐시에 적을 경우 실제로는 전송되지 않은 content의 시각이 "이미 동기화됨"으로 기록되어 그 수정분이 조용히 누락된다.
- 캐시 항목은 업로드가 확정적으로 성공했을 때만 갱신한다.
  - 이유: 실패 시 건드리지 않아야 다음 이벤트나 스윕이 별도 재시도 로직 없이 자연스럽게 재시도 역할을 한다.
- 이 캐시의 키 목록을 삭제 감지용 "이전에 동기화된 경로 목록"으로 재사용해, sync policy에서 대안으로 제시했던 `GET /sources` 커서 페이지네이션을 대체한다.
  - 가드: 캐시가 최소 한 번 이상 완전한 백필을 마치기 전에는 삭제 감지를 실행하면 안 된다.
  - 비어 있거나 일부만 채워진 캐시를 "전부 삭제됨"으로 해석해서는 절대 안 된다.

## Consequences

- 변경되지 않은 노트는 스윕마다 네트워크/서버 비용이 전혀 들지 않는다.
  - 실제로 수정된 파일만 `POST /sources`에 도달한다.
- 삭제 감지가 추가 API 호출 없이 로컬 소스 오브 트루스를 공짜로 얻는다.
- 감수하는 비용: 캐시 유실(플러그인 재설치, `data.json` 손상)은 재동기화 1회분의 비용을 발생시킨다.
  - 감수 가능: 한정적이고 자연 복구되는 비용이지 정합성 버그가 아니다.
- 감수하는 비용: mtime만 비교하는 방식은 외부 도구가 mtime을 갱신하지 않고 content만 바꾸는 극단적 케이스에서 실제 변경을 놓칠 수 있다.
  - 감수 가능: correctness의 1차 방어선은 이벤트 기반 경로이고, 스윕은 보조 안전망일 뿐이다.
- 후속 과제: 삭제 감지의 부트스트랩 가드(캐시가 완전한 백필을 마쳤는지 플러그인이 어떻게 아는지)의 구체적인 구현은 필요하지만, 이 ADR에서 결정하지 않는다.