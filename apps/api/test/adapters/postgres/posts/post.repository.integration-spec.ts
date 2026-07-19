import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { type PostRepository } from '@contexts/posts/domain';
import { type SourceRepository } from '@contexts/sources/domain';
import { POST_REPOSITORY } from '@contexts/posts/posts.di-tokens';
import { SOURCE_REPOSITORY } from '@contexts/sources/sources.di-tokens';
import { AppModule } from '@platform/nest/app.module';
import { buildPost } from '../../../support/domains/fixtures/post.fixture';
import { buildSource } from '../../../support/domains/fixtures/source.fixture';

describe('PostPgDrizzleRepository', () => {
  let app: INestApplication;
  let posts: PostRepository;
  let sources: SourceRepository;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    posts = app.get<PostRepository>(POST_REPOSITORY);
    sources = app.get<SourceRepository>(SOURCE_REPOSITORY);
  });

  afterAll(async () => {
    await app.close();
  });

  it('post를 저장하고 id로 조회한다', async () => {
    const source = await sources.save(
      buildSource({ externalSourceId: 'Notes/post-repo-get.md' }),
    );
    const post = buildPost({ sourceId: source.id, title: '조회 테스트' });

    await posts.save(post);
    const result = await posts.get({ id: post.id });

    expect(result.id).toBe(post.id);
    expect(result.getProps().title.unpack()).toBe('조회 테스트');
    expect(result.getProps().sourceId).toBe(source.id);
    expect(result.getProps().viewCount.unpack()).toBe(0);
  });

  it('post를 갱신한다', async () => {
    const source = await sources.save(
      buildSource({ externalSourceId: 'Notes/post-repo-update.md' }),
    );
    const post = buildPost({ sourceId: source.id });
    await posts.save(post);

    post.incrementViewCount();
    await posts.save(post);
    const result = await posts.get({ id: post.id });

    expect(result.getProps().viewCount.unpack()).toBe(1);
  });

  it('존재하지 않는 id는 NOT_FOUND exception을 throw한다', async () => {
    await expect(posts.get({ id: 'non-existent-id' })).rejects.toMatchObject({
      kind: 'not_found',
      code: 'post.get_failed',
    });
  });

  it('sourceId로 post를 조회한다', async () => {
    const source = await sources.save(
      buildSource({ externalSourceId: 'Notes/post-repo-find-by-source.md' }),
    );
    const post = buildPost({ sourceId: source.id });
    await posts.save(post);

    const result = await posts.find({ sourceId: source.id });

    expect(result?.id).toBe(post.id);
    expect(result?.getProps().sourceId).toBe(source.id);
  });

  it('게시되지 않은 sourceId는 null을 반환한다', async () => {
    const result = await posts.find({ sourceId: 'non-existent-source-id' });

    expect(result).toBeNull();
  });

  it('post 목록을 반환한다', async () => {
    const source1 = await sources.save(
      buildSource({ externalSourceId: 'Notes/post-repo-list-1.md' }),
    );
    const source2 = await sources.save(
      buildSource({ externalSourceId: 'Notes/post-repo-list-2.md' }),
    );
    const post1 = buildPost({ sourceId: source1.id });
    const post2 = buildPost({ sourceId: source2.id });
    await posts.save(post1);
    await posts.save(post2);

    const result = await posts.list();

    const ids = result.map((p) => p.id);
    expect(ids).toContain(post1.id);
    expect(ids).toContain(post2.id);
  });

  it('trigram 검색으로 유사한 title을 가진 post를 반환한다', async () => {
    const source1 = await sources.save(
      buildSource({ externalSourceId: 'Notes/post-repo-trgm-match.md' }),
    );
    const source2 = await sources.save(
      buildSource({ externalSourceId: 'Notes/post-repo-trgm-nomatch.md' }),
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

    const result = await posts.list({ query: 'TypeScript' });

    const ids = result.map((p) => p.id);
    expect(ids).toContain(matchingPost.id);
    expect(ids).not.toContain(unrelatedPost.id);
  });

  it('오타가 포함된 query로도 유사한 title을 가진 post를 반환한다', async () => {
    const source = await sources.save(
      buildSource({ externalSourceId: 'Notes/post-repo-trgm-typo.md' }),
    );
    const post = buildPost({
      sourceId: source.id,
      title: 'TypeScript 입문 가이드',
    });
    await posts.save(post);

    const result = await posts.list({ query: 'TypeScirpt' });

    const ids = result.map((p) => p.id);
    expect(ids).toContain(post.id);
  });

  it('trigram 검색에 일치하는 post가 없으면 빈 배열을 반환한다', async () => {
    const result = await posts.list({ query: '일치하지않는쿼리xyz' });

    expect(result).toHaveLength(0);
  });

  it('같은 sourceId로 두 번 저장하면 conflict exception을 발생시킨다', async () => {
    const source = await sources.save(
      buildSource({ externalSourceId: 'Notes/post-repo-conflict.md' }),
    );
    const post1 = buildPost({ sourceId: source.id });
    const post2 = buildPost({ sourceId: source.id });
    await posts.save(post1);

    await expect(posts.save(post2)).rejects.toMatchObject({
      kind: 'conflict',
      code: 'post.save_failed',
    });
  });
});
