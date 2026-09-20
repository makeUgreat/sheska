import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { type PostRepository } from '@contexts/library/domain';
import { type SourceRepository } from '@contexts/library/domain';
import { POST_REPOSITORY } from '@contexts/library/library.di-tokens';
import { SOURCE_REPOSITORY } from '@contexts/library/library.di-tokens';
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
    const source = await sources.insert(
      buildSource({ externalSourceId: 'Notes/post-repo-get.md' }),
    );
    const post = buildPost({ sourceId: source.id, title: '조회 테스트' });

    await posts.insert(post);
    const result = await posts.get({ id: post.id });

    expect(result.id).toBe(post.id);
    expect(result.sourceId).toBe(source.id);
    expect(result.getProps().viewCount.unpack()).toBe(0);
  });

  it('post를 갱신한다', async () => {
    const source = await sources.insert(
      buildSource({ externalSourceId: 'Notes/post-repo-update.md' }),
    );
    const post = buildPost({ sourceId: source.id });
    await posts.insert(post);

    post.incrementViewCount();
    await posts.update(post);
    const result = await posts.get({ id: post.id });

    expect(result.getProps().viewCount.unpack()).toBe(1);
  });

  it('존재하지 않는 id는 NotFoundError를 throw한다', async () => {
    await expect(posts.get({ id: 'non-existent-id' })).rejects.toMatchObject({
      kind: 'not_found',
      code: 'post.not_found',
    });
  });

  it('존재하지 않는 post를 update하면 NotFoundError를 throw한다', async () => {
    const source = await sources.insert(
      buildSource({ externalSourceId: 'Notes/post-repo-update-missing.md' }),
    );
    const post = buildPost({ sourceId: source.id });

    await expect(posts.update(post)).rejects.toMatchObject({
      kind: 'not_found',
      code: 'post.not_found',
    });
  });

  it('같은 sourceId로 두 번 insert하면 constraint_violation exception을 발생시킨다', async () => {
    const source = await sources.insert(
      buildSource({ externalSourceId: 'Notes/post-repo-conflict.md' }),
    );
    const post1 = buildPost({ sourceId: source.id });
    const post2 = buildPost({ sourceId: source.id });
    await posts.insert(post1);

    await expect(posts.insert(post2)).rejects.toMatchObject({
      kind: 'constraint_violation',
      code: 'post.already_exists',
    });
  });
});
