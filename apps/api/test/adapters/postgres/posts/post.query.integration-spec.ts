import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { type PostQuery } from '@contexts/posts/application/ports';
import { type PostRepository } from '@contexts/posts/domain';
import { type SourceRepository } from '@contexts/sources/domain';
import { POST_QUERY, POST_REPOSITORY } from '@contexts/posts/posts.di-tokens';
import { SOURCE_REPOSITORY } from '@contexts/sources/sources.di-tokens';
import {
  type SourceVectorRepository,
  SOURCE_VECTOR_REPOSITORY,
} from '@contexts/ingestion/ingestion.di-tokens';
import { AppModule } from '@platform/nest/app.module';
import { buildPost } from '../../../support/domains/fixtures/post.fixture';
import { buildSource } from '../../../support/domains/fixtures/source.fixture';
import {
  buildSourceVector,
  VALID_EMBEDDING,
} from '../../../support/domains/fixtures/source-vector.fixture';

describe('PostPgDrizzleQuery', () => {
  let app: INestApplication;
  let postQuery: PostQuery;
  let posts: PostRepository;
  let sources: SourceRepository;
  let sourceVectors: SourceVectorRepository;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    postQuery = app.get<PostQuery>(POST_QUERY);
    posts = app.get<PostRepository>(POST_REPOSITORY);
    sources = app.get<SourceRepository>(SOURCE_REPOSITORY);
    sourceVectors = app.get<SourceVectorRepository>(SOURCE_VECTOR_REPOSITORY);
  });

  afterAll(async () => {
    await app.close();
  });

  it('post를 sourceContent와 함께 id로 조회한다', async () => {
    const source = await sources.save(
      buildSource({
        externalSourceId: 'Notes/post-query-get.md',
        content: '# 조회 테스트 본문',
      }),
    );
    const post = buildPost({ sourceId: source.id, title: '조회 테스트' });
    await posts.save(post);

    const result = await postQuery.find({ id: post.id });

    expect(result).toMatchObject({
      postId: post.id,
      sourceId: source.id,
      title: '조회 테스트',
      viewCount: 0,
      sourceContent: '# 조회 테스트 본문',
    });
  });

  it('존재하지 않는 id는 null을 반환한다', async () => {
    const result = await postQuery.find({ id: 'non-existent-id' });

    expect(result).toBeNull();
  });

  it('viewCount 증가 후 getById가 갱신된 값을 반환한다', async () => {
    const source = await sources.save(
      buildSource({ externalSourceId: 'Notes/post-query-viewcount.md' }),
    );
    const post = buildPost({ sourceId: source.id });
    await posts.save(post);

    post.incrementViewCount();
    await posts.save(post);

    const result = await postQuery.find({ id: post.id });

    expect(result?.viewCount).toBe(1);
  });

  it('post 목록을 페이지네이션으로 반환한다', async () => {
    const source1 = await sources.save(
      buildSource({ externalSourceId: 'Notes/post-query-paginate-1.md' }),
    );
    const source2 = await sources.save(
      buildSource({ externalSourceId: 'Notes/post-query-paginate-2.md' }),
    );
    const post1 = buildPost({ sourceId: source1.id });
    const post2 = buildPost({ sourceId: source2.id });
    await posts.save(post1);
    await posts.save(post2);

    const { posts: result } = await postQuery.paginate({
      limit: 20,
      cursor: null,
    });

    const ids = result.map((p) => p.postId);
    expect(ids).toContain(post1.id);
    expect(ids).toContain(post2.id);
  });

  describe('paginate — cursor pagination', () => {
    it('limit보다 많은 포스트가 있으면 nextCursor를 반환한다', async () => {
      const s1 = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-cursor-1.md' }),
      );
      const s2 = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-cursor-2.md' }),
      );
      const s3 = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-cursor-3.md' }),
      );
      await posts.save(buildPost({ sourceId: s1.id }));
      await posts.save(buildPost({ sourceId: s2.id }));
      await posts.save(buildPost({ sourceId: s3.id }));

      const { posts: result, nextCursor } = await postQuery.paginate({
        limit: 2,
        cursor: null,
      });

      expect(result).toHaveLength(2);
      expect(nextCursor).not.toBeNull();
    });

    it('nextCursor로 다음 페이지를 가져온다', async () => {
      const s1 = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-cursor-page-1.md' }),
      );
      const s2 = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-cursor-page-2.md' }),
      );
      const s3 = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-cursor-page-3.md' }),
      );
      const post1 = buildPost({ sourceId: s1.id });
      const post2 = buildPost({ sourceId: s2.id });
      const post3 = buildPost({ sourceId: s3.id });
      await posts.save(post1);
      await posts.save(post2);
      await posts.save(post3);

      const firstPage = await postQuery.paginate({ limit: 2, cursor: null });
      const secondPage = await postQuery.paginate({
        limit: 2,
        cursor: firstPage.nextCursor!,
      });

      const firstIds = firstPage.posts.map((p) => p.postId);
      const secondIds = secondPage.posts.map((p) => p.postId);
      expect(firstIds).toHaveLength(2);
      expect(secondIds.length).toBeGreaterThanOrEqual(1);
      expect(firstIds.some((id) => secondIds.includes(id))).toBe(false);
    });

    it('마지막 포스트 이후의 cursor로 조회하면 nextCursor가 null이다', async () => {
      const s1 = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-cursor-last-1.md' }),
      );
      await posts.save(buildPost({ sourceId: s1.id }));

      const veryOldCursor = { id: '00000000-0000-0000-0000-000000000000' };
      const { posts: result, nextCursor } = await postQuery.paginate({
        limit: 10,
        cursor: veryOldCursor,
      });

      expect(result).toHaveLength(0);
      expect(nextCursor).toBeNull();
    });

    it('cursor와 동일한 id를 가진 포스트는 결과에서 제외된다', async () => {
      const s1 = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-cursor-tie-1.md' }),
      );
      const post1 = buildPost({ sourceId: s1.id });
      await posts.save(post1);

      const { posts: saved } = await postQuery.paginate({
        limit: 100,
        cursor: null,
      });
      const savedPost1 = saved.find((p) => p.postId === post1.id)!;
      const cursor = { id: savedPost1.postId };

      const { posts: result } = await postQuery.paginate({ limit: 10, cursor });

      const ids = result.map((p) => p.postId);
      expect(ids).not.toContain(post1.id);
    });

    it('cursor 없이 호출하면 최신순으로 첫 페이지를 반환한다', async () => {
      const s1 = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-cursor-order-1.md' }),
      );
      const s2 = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-cursor-order-2.md' }),
      );
      const post1 = buildPost({ sourceId: s1.id });
      const post2 = buildPost({ sourceId: s2.id });
      await posts.save(post1);
      await posts.save(post2);

      const { posts: result } = await postQuery.paginate({
        limit: 2,
        cursor: null,
      });

      const ids = result.map((p) => p.postId);
      expect(ids).toContain(post1.id);
      expect(ids).toContain(post2.id);
    });
  });

  describe('search', () => {
    it('title이 일치하는 post를 반환한다', async () => {
      const source1 = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-trgm-match.md' }),
      );
      const source2 = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-trgm-nomatch.md' }),
      );
      const matchingPost = buildPost({
        sourceId: source1.id,
        title: 'TypeScript 입문 가이드',
      });
      const unrelatedPost = buildPost({
        sourceId: source2.id,
        title: '파이썬 데이터 분석',
      });
      await posts.save(matchingPost);
      await posts.save(unrelatedPost);

      const { posts: result } = await postQuery.search({
        query: 'TypeScript',
        limit: 20,
        cursor: null,
        queryEmbedding: null,
      });

      const ids = result.map((p) => p.postId);
      expect(ids).toContain(matchingPost.id);
      expect(ids).not.toContain(unrelatedPost.id);
    });

    it('오타가 포함된 query로도 유사한 title을 가진 post를 반환한다', async () => {
      const source = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-trgm-typo.md' }),
      );
      const post = buildPost({
        sourceId: source.id,
        title: 'TypeScript 입문 가이드',
      });
      await posts.save(post);

      const { posts: result } = await postQuery.search({
        query: 'TypeScirpt',
        limit: 20,
        cursor: null,
        queryEmbedding: null,
      });

      const ids = result.map((p) => p.postId);
      expect(ids).toContain(post.id);
    });

    it('짧은 query가 긴 title의 일부 단어와 일치하면 post를 반환한다', async () => {
      const source = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-trgm-word.md' }),
      );
      const post = buildPost({
        sourceId: source.id,
        title: '소켓은 애플리케이션 계층과 전송계층간의 인터페이스이다',
      });
      await posts.save(post);

      const { posts: result } = await postQuery.search({
        query: '소켓',
        limit: 20,
        cursor: null,
        queryEmbedding: null,
      });

      const ids = result.map((p) => p.postId);
      expect(ids).toContain(post.id);
    });

    it('유사도 높은 순서로 결과를 반환한다', async () => {
      const source1 = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-trgm-order-1.md' }),
      );
      const source2 = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-trgm-order-2.md' }),
      );
      const exactPost = buildPost({
        sourceId: source1.id,
        title: 'TypeScript',
      });
      const partialPost = buildPost({
        sourceId: source2.id,
        title: 'TypeScript 입문 가이드 완벽 정리',
      });
      await posts.save(exactPost);
      await posts.save(partialPost);

      const { posts: result } = await postQuery.search({
        query: 'TypeScript',
        limit: 20,
        cursor: null,
        queryEmbedding: null,
      });

      const ids = result.map((p) => p.postId);
      expect(ids.indexOf(exactPost.id)).toBeLessThan(
        ids.indexOf(partialPost.id),
      );
    });

    it('검색 결과를 nextCursor로 다음 페이지 조회한다', async () => {
      const s1 = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-search-cursor-1.md' }),
      );
      const s2 = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-search-cursor-2.md' }),
      );
      const s3 = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-search-cursor-3.md' }),
      );
      await posts.save(buildPost({ sourceId: s1.id, title: 'TypeScript A' }));
      await posts.save(buildPost({ sourceId: s2.id, title: 'TypeScript B' }));
      await posts.save(buildPost({ sourceId: s3.id, title: 'TypeScript C' }));

      const firstPage = await postQuery.search({
        query: 'TypeScript',
        limit: 2,
        cursor: null,
        queryEmbedding: null,
      });
      const secondPage = await postQuery.search({
        query: 'TypeScript',
        limit: 2,
        cursor: firstPage.nextCursor!,
        queryEmbedding: null,
      });

      const firstIds = firstPage.posts.map((p) => p.postId);
      const secondIds = secondPage.posts.map((p) => p.postId);
      expect(firstPage.nextCursor?.score).toEqual(expect.any(Number));
      expect(firstIds).toHaveLength(2);
      expect(secondIds.length).toBeGreaterThanOrEqual(1);
      expect(firstIds.some((id) => secondIds.includes(id))).toBe(false);
    });

    it('content이 일치하는 post를 title 검색어 없이도 반환한다', async () => {
      const source = await sources.save(
        buildSource({
          externalSourceId: 'Notes/pq-content-match.md',
          content: '이 문서는 리액트훅에 대한 심화 설명을 담고 있다',
        }),
      );
      const post = buildPost({
        sourceId: source.id,
        title: '프론트엔드 스터디 노트',
      });
      await posts.save(post);

      const { posts: result } = await postQuery.search({
        query: '리액트훅',
        limit: 20,
        cursor: null,
        queryEmbedding: null,
      });

      const ids = result.map((p) => p.postId);
      expect(ids).toContain(post.id);
    });

    it('title 일치가 content 일치보다 높은 순위로 반환된다', async () => {
      const titleSource = await sources.save(
        buildSource({
          externalSourceId: 'Notes/pq-weight-title.md',
          content: '관련 없는 본문',
        }),
      );
      const contentSource = await sources.save(
        buildSource({
          externalSourceId: 'Notes/pq-weight-content.md',
          content: '쿠버네티스 클러스터 운영 경험을 공유합니다',
        }),
      );
      const titleMatch = buildPost({
        sourceId: titleSource.id,
        title: '쿠버네티스',
      });
      const contentMatch = buildPost({
        sourceId: contentSource.id,
        title: '운영 회고',
      });
      await posts.save(titleMatch);
      await posts.save(contentMatch);

      const { posts: result } = await postQuery.search({
        query: '쿠버네티스',
        limit: 20,
        cursor: null,
        queryEmbedding: null,
      });

      const ids = result.map((p) => p.postId);
      expect(ids.indexOf(titleMatch.id)).toBeLessThan(
        ids.indexOf(contentMatch.id),
      );
    });

    it('검색어에 일치하는 post가 없으면 빈 배열을 반환한다', async () => {
      const { posts: result } = await postQuery.search({
        query: '일치하지않는쿼리xyz',
        limit: 20,
        cursor: null,
        queryEmbedding: null,
      });

      expect(result).toHaveLength(0);
    });

    it('제목만 키워드 매치하고 임베딩이 없어도 하이브리드 쿼리에서 반환된다', async () => {
      const source = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-hybrid-fts-only.md' }),
      );
      const post = buildPost({
        sourceId: source.id,
        title: 'RustLang 동시성 모델',
      });
      await posts.save(post);

      const { posts: result } = await postQuery.search({
        query: 'RustLang',
        limit: 20,
        cursor: null,
        queryEmbedding: VALID_EMBEDDING,
      });

      const ids = result.map((p) => p.postId);
      expect(ids).toContain(post.id);
    });

    it('키워드 겹침 없이 임베딩만 근접해도 하이브리드 쿼리에서 반환된다', async () => {
      const source = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-hybrid-vector-only.md' }),
      );
      const post = buildPost({
        sourceId: source.id,
        title: '완전히 무관한 제목',
      });
      await posts.save(post);
      const queryEmbedding = Array.from({ length: 1024 }, () => 1);
      await sourceVectors.save(
        buildSourceVector({
          sourceId: source.id,
          chunks: [
            {
              chunkIndex: 0,
              chunkContent: 'chunk content',
              embedding: Array.from({ length: 1024 }, () => 1),
            },
          ],
        }),
      );

      const { posts: result } = await postQuery.search({
        query: '없는키워드zzz',
        limit: 20,
        cursor: null,
        queryEmbedding,
      });

      const ids = result.map((p) => p.postId);
      expect(ids).toContain(post.id);
    });

    it('FTS와 벡터 둘 다 강한 post가 하나만 강한 post보다 상위 순위로 반환된다', async () => {
      const bothSource = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-hybrid-rrf-both.md' }),
      );
      const ftsOnlySource = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-hybrid-rrf-fts-only.md' }),
      );
      const bothPost = buildPost({
        sourceId: bothSource.id,
        title: 'GraphQL 스키마 설계',
      });
      const ftsOnlyPost = buildPost({
        sourceId: ftsOnlySource.id,
        title: 'GraphQL 스키마 설계',
      });
      await posts.save(bothPost);
      await posts.save(ftsOnlyPost);
      const queryEmbedding = Array.from({ length: 1024 }, () => 1);
      await sourceVectors.save(
        buildSourceVector({
          sourceId: bothSource.id,
          chunks: [
            {
              chunkIndex: 0,
              chunkContent: 'chunk content',
              embedding: Array.from({ length: 1024 }, () => 1),
            },
          ],
        }),
      );
      await sourceVectors.save(
        buildSourceVector({
          sourceId: ftsOnlySource.id,
          chunks: [
            {
              chunkIndex: 0,
              chunkContent: 'chunk content',
              embedding: Array.from({ length: 1024 }, () => -1),
            },
          ],
        }),
      );

      const { posts: result } = await postQuery.search({
        query: 'GraphQL',
        limit: 20,
        cursor: null,
        queryEmbedding,
      });

      const ids = result.map((p) => p.postId);
      expect(ids.indexOf(bothPost.id)).toBeLessThan(
        ids.indexOf(ftsOnlyPost.id),
      );
    });

    it('하이브리드 검색 결과를 nextCursor로 다음 페이지 조회한다', async () => {
      const hs1 = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-hybrid-cursor-1.md' }),
      );
      const hs2 = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-hybrid-cursor-2.md' }),
      );
      const hs3 = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-hybrid-cursor-3.md' }),
      );
      await posts.save(buildPost({ sourceId: hs1.id, title: 'Kotlin A' }));
      await posts.save(buildPost({ sourceId: hs2.id, title: 'Kotlin B' }));
      await posts.save(buildPost({ sourceId: hs3.id, title: 'Kotlin C' }));
      const queryEmbedding = Array.from({ length: 1024 }, () => 1);

      const firstPage = await postQuery.search({
        query: 'Kotlin',
        limit: 2,
        cursor: null,
        queryEmbedding,
      });
      const secondPage = await postQuery.search({
        query: 'Kotlin',
        limit: 2,
        cursor: firstPage.nextCursor!,
        queryEmbedding,
      });

      const firstIds = firstPage.posts.map((p) => p.postId);
      const secondIds = secondPage.posts.map((p) => p.postId);
      expect(firstPage.nextCursor?.score).toEqual(expect.any(Number));
      expect(firstIds).toHaveLength(2);
      expect(secondIds.length).toBeGreaterThanOrEqual(1);
      expect(firstIds.some((id) => secondIds.includes(id))).toBe(false);
    });
  });

  describe('count', () => {
    it('post를 저장하면 전체 갯수가 증가한다', async () => {
      const before = await postQuery.count();
      const source = await sources.save(
        buildSource({ externalSourceId: 'Notes/post-query-count.md' }),
      );
      await posts.save(buildPost({ sourceId: source.id }));

      const after = await postQuery.count();

      expect(after).toBe(before + 1);
    });
  });
});
