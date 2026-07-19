import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { type PostQuery } from '@contexts/posts/application/ports';
import { type PostRepository } from '@contexts/posts/domain';
import { type SourceRepository } from '@contexts/sources/domain';
import { POST_QUERY, POST_REPOSITORY } from '@contexts/posts/posts.di-tokens';
import { SOURCE_REPOSITORY } from '@contexts/sources/sources.di-tokens';
import { AppModule } from '@platform/nest/app.module';
import { buildPost } from '../../../support/domains/fixtures/post.fixture';
import { buildSource } from '../../../support/domains/fixtures/source.fixture';

describe('PostPgDrizzleQuery', () => {
  let app: INestApplication;
  let postQuery: PostQuery;
  let posts: PostRepository;
  let sources: SourceRepository;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    postQuery = app.get<PostQuery>(POST_QUERY);
    posts = app.get<PostRepository>(POST_REPOSITORY);
    sources = app.get<SourceRepository>(SOURCE_REPOSITORY);
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

    const { posts: result } = await postQuery.paginate();

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

      const firstPage = await postQuery.paginate({ limit: 2 });
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

      const veryOldCursor = {
        createdAt: new Date('2000-01-01T00:00:00.000Z'),
        id: 'z',
      };
      const { posts: result, nextCursor } = await postQuery.paginate({
        limit: 10,
        cursor: veryOldCursor,
      });

      expect(result).toHaveLength(0);
      expect(nextCursor).toBeNull();
    });

    it('cursor와 동일한 createdAt + id를 가진 포스트는 결과에서 제외된다', async () => {
      const s1 = await sources.save(
        buildSource({ externalSourceId: 'Notes/pq-cursor-tie-1.md' }),
      );
      const post1 = buildPost({ sourceId: s1.id });
      await posts.save(post1);

      const { posts: saved } = await postQuery.paginate({ limit: 100 });
      const savedPost1 = saved.find((p) => p.postId === post1.id)!;
      const cursor = { createdAt: savedPost1.createdAt, id: savedPost1.postId };

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

      const { posts: result } = await postQuery.paginate({ limit: 2 });

      const ids = result.map((p) => p.postId);
      expect(ids).toContain(post1.id);
      expect(ids).toContain(post2.id);
    });
  });

  describe('search', () => {
    it('trigram 검색으로 유사한 title을 가진 post를 반환한다', async () => {
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
      });
      const secondPage = await postQuery.search({
        query: 'TypeScript',
        limit: 2,
        cursor: firstPage.nextCursor!,
      });

      const firstIds = firstPage.posts.map((p) => p.postId);
      const secondIds = secondPage.posts.map((p) => p.postId);
      expect(firstPage.nextCursor?.score).toEqual(expect.any(Number));
      expect(firstIds).toHaveLength(2);
      expect(secondIds.length).toBeGreaterThanOrEqual(1);
      expect(firstIds.some((id) => secondIds.includes(id))).toBe(false);
    });

    it('trigram 검색에 일치하는 post가 없으면 빈 배열을 반환한다', async () => {
      const { posts: result } = await postQuery.search({
        query: '일치하지않는쿼리xyz',
        limit: 20,
      });

      expect(result).toHaveLength(0);
    });
  });
});
