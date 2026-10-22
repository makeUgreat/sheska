---
title: 용어집
applies_to:
  - 모든 bounded context의 도메인 용어
read_when:
  - 도메인 용어의 정확한 뜻을 확인할 때
  - 코드, 화면 문구, 문서에 쓸 이름을 정할 때
related:
  - ../domain-document-guidelines.md
---

# 용어집

## library

- 소유자: vault와 이 시스템의 주인이다.
- 관리 화면: 소유자가 source와 sync job을 보는 화면이다.
- vault: 소유자의 Obsidian 저장소다.
- 동기화 대상: source로 받아 둘 vault 파일이다.
- source(`Source`): 동기화 대상 하나를 받아 둔 사본이다.
- `externalSourceId`(`ExternalSourceId`): source가 온 vault 안의 파일 경로다.
  - "파일 경로"라고 부를 때도 같은 것이다.
- 내용 스냅샷(`SourceContentSnapshot`): 마지막으로 받은 파일 내용을 frontmatter, 제목, 본문으로 나눈 것이다.
- frontmatter(`SourceFrontmatter`): 파일 맨 앞의 `---`로 둘러싼 YAML mapping이다.
- 본문: 파일 내용에서 frontmatter를 뺀 나머지다.
  - 예: frontmatter가 없는 파일은 파일 내용 전체가 본문이다.
- source 제목: source를 목록과 화면에서 부르는 이름이다.
- fingerprint(`SourceFingerprint`): 임베딩이 읽는 입력의 hash다.
- sync job(`SourceSyncJob`): source의 한 버전을 임베딩하도록 요청한 기록이다.
  - 임베딩 자체와 다르다. 임베딩은 `ingestion`이 만든다.
- 가장 최근 sync job: 한 source의 sync job 중 가장 나중에 만든 것이다.
- 처리 중(`processing`): 대기 중인 sync job의 임베딩이 진행되고 있는 상태다.
- 동기화: vault 파일을 source로 받아 저장하는 일이다.
- 동기화 클라이언트: vault 파일을 이 시스템으로 보내는 Obsidian 플러그인이다.
- source 업로드: 동기화 클라이언트가 파일 하나를 보내는 요청 하나다.
- post(`Post`): 소유자가 발행한 source다.
  - source와 다르다. 발행하지 않은 source도 있다.
- 발행: source를 post로 만드는 일이다.
- 조회수(`PostViewCount`): post 상세를 조회한 횟수다.
- 수정 시각: post 자신의 상태가 마지막으로 바뀐 시각이다.
- 키워드 검색: 질의의 단어가 제목이나 본문에 들어 있는 post를 찾는 검색이다.
- 의미 검색: 질의의 임베딩과 가까운 청크 임베딩을 가진 post를 찾는 검색이다.
- 유사도: 질의의 임베딩과 청크 임베딩이 얼마나 가까운지 나타내는 값이다.
- 순위 점수: 키워드 검색과 의미 검색의 결과를 합쳐 순서를 정하는 값이다.
  - 유사도와 다르다.
- 일치 이유: 검색 결과가 키워드 검색, 의미 검색, 둘 다 중 무엇으로 찾아졌는지다.

## ingestion

- 임베딩 대상 본문: `library`가 sync job과 함께 넘겨주는 source의 본문이다.
- 청크(chunk): 임베딩 대상 본문을 검색 단위로 나눈 조각이다.
- 청크 임베딩(`ChunkEmbedding`): 청크 하나와 그 청크의 벡터다.
- source 임베딩(`SourceEmbedding`): source 하나에 속한 청크 임베딩 전체다.
  - "임베딩"이라고만 부를 때는 source 임베딩이다.
- 임베딩 모델(`EmbeddingModel`): 벡터를 만드는 모델이다.
- 임베딩 workflow: sync job 하나를 처리하는 작업 묶음이다.
