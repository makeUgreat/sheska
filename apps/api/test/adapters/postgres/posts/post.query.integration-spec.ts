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
});
