---
title: 용어집
applies_to:
  - 모든 bounded context의 도메인 용어
read_when:
  - 도메인 용어의 정확한 뜻을 확인할 때
  - 코드, 화면 문구, 문서에 쓸 이름을 정할 때
---

# 용어집

## library

- 소유자: vault와 이 시스템의 주인임
- vault: 소유자의 Obsidian 저장소임
- 동기화 대상: source로 받아 둘 vault 파일임
- source(`Source`): 동기화 대상 하나를 받아 둔 사본임
- `externalSourceId`(`ExternalSourceId`): source가 온 vault 안의 파일 경로임
  - "파일 경로"라고 부를 때도 같은 것임
- 내용 스냅샷: 마지막으로 받은 파일 내용을 frontmatter와 본문으로 나눈 것임
- frontmatter(`SourceFrontmatter`): 파일 맨 앞의 `---`로 둘러싼 YAML mapping임
- 본문: 파일 내용에서 frontmatter를 뺀 나머지임
  - 예: frontmatter가 없는 파일은 파일 내용 전체가 본문임
- source 제목: source를 목록과 화면에서 부르는 이름임
  - 내용 스냅샷에 따로 담기지 않음. frontmatter와 `externalSourceId`에서 정해짐(`library-source-3`)
- fingerprint(`SourceFingerprint`): 임베딩이 읽는 입력의 hash임
- sync job(`SourceSyncJob`): source의 한 버전을 임베딩하도록 요청한 기록임
  - 임베딩 자체와 다름. 임베딩은 `ingestion`이 만듦
- 가장 최근 sync job: 한 source의 sync job 중 가장 나중에 만든 것임
- 처리 중(`processing`): 대기 중인 sync job의 임베딩이 진행되고 있는 상태임
- 동기화: vault 파일을 source로 받아 저장하는 일임
- 동기화 클라이언트: vault 파일을 이 시스템으로 보내는 Obsidian 플러그인임
- source 업로드: 동기화 클라이언트가 파일 하나를 보내는 요청 하나임
- post(`Post`): 소유자가 발행한 source임
  - source와 다름. 발행하지 않은 source도 있음
- 발행: source를 post로 만드는 일임
- 조회수(`PostViewCount`): post 상세를 조회한 횟수임
- 수정 시각: post 자신의 상태가 마지막으로 바뀐 시각임
- 키워드 검색: 질의의 단어가 제목이나 본문에 들어 있는 post를 찾는 검색임
- 의미 검색: 질의의 임베딩과 가까운 청크 임베딩을 가진 post를 찾는 검색임
- 유사도: 질의의 임베딩과 청크 임베딩이 얼마나 가까운지 나타내는 값임
- 순위 점수: 키워드 검색과 의미 검색의 결과를 합쳐 순서를 정하는 값임
  - 유사도와 다름
- 일치 이유: 검색 결과가 키워드 검색, 의미 검색, 둘 다 중 무엇으로 찾아졌는지임

## ingestion

- 임베딩 대상 본문: `library`가 sync job과 함께 넘겨주는 source의 본문임
- 청크(chunk): 임베딩 대상 본문을 검색 단위로 나눈 조각임
- 청크 임베딩(`ChunkEmbedding`): 청크 하나와 그 청크의 벡터임
- source 임베딩(`SourceEmbedding`): source 하나에 속한 청크 임베딩 전체임
  - "임베딩"이라고만 부를 때는 source 임베딩임
- 임베딩 모델(`EmbeddingModel`): 벡터를 만드는 모델임
- 임베딩 workflow: sync job 하나를 처리하는 작업 묶음임

## iam

- 로그인: 소유자가 비밀번호로 자신을 증명하고 세션을 받는 일임
- 세션: 로그인한 브라우저를 알아보는 기록임. 로그인한 때부터 30일 동안 유효함
- 로그인 시도 제한: 같은 IP에서 5분 동안 5번 틀리면 5분 동안 로그인을 막는 규칙임
- API 토큰: 플러그인 같은 프로그램이 소유자 대신 API를 부를 때 내는 비밀 값임. 소유자가 이름을 붙여 여러 개 발급하고, 하나씩 폐기함. 서버는 원문 대신 SHA-256 hash만 저장함
