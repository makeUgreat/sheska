import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type TestingModule } from '@nestjs/testing';
import { PostView, PostViewClient, type PostRepository, type PostViewRepository, type SourceRepository } from '@contexts/library/domain';
import { POST_REPOSITORY, POST_VIEW_REPOSITORY, SOURCE_REPOSITORY } from '@contexts/library/library.di-tokens';
import { SourcePgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/source.pg-drizzle.repository';
import { PostPgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/post.pg-drizzle.repository';
import { PostViewPgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/post-view.pg-drizzle.repository';
import { buildPost } from '../../../support/domains/fixtures/post.fixture';
import { buildSource } from '../../../support/domains/fixtures/source.fixture';
import { setupPostgresTestingModule } from '../support/setup-postgres-testing-module';

describe('PostViewPgDrizzleRepository', () => {
  let testingModule: TestingModule;
  let postViews: PostViewRepository;
  let posts: PostRepository;
  let sources: SourceRepository;

  beforeAll(async () => {
    testingModule = await setupPostgresTestingModule([
      { provide: SOURCE_REPOSITORY, useClass: SourcePgDrizzleRepository },
      { provide: POST_REPOSITORY, useClass: PostPgDrizzleRepository },
      { provide: POST_VIEW_REPOSITORY, useClass: PostViewPgDrizzleRepository },
    ]);
    postViews = testingModule.get<PostViewRepository>(POST_VIEW_REPOSITORY);
    posts = testingModule.get<PostRepository>(POST_REPOSITORY);
    sources = testingModule.get<SourceRepository>(SOURCE_REPOSITORY);
  });

  afterAll(async () => {
    await testingModule.close();
  });

  async function insertPost(externalSourceId: string): Promise<string> {
    const source = await sources.insert(buildSource({ externalSourceId }));
    const post = await posts.insert(buildPost({ sourceId: source.id }));

    return post.id;
  }

  function buildView(params: { postId: string; ip?: string; viewedAt: string }): PostView {
    return PostView.of({
      postId: params.postId,
      ip: params.ip ?? '203.0.113.1',
      client: PostViewClient.of('Mozilla/5.0'),
      viewedAt: new Date(params.viewedAt),
    });
  }

  // nocap: library-post-7
  it('넣은 방문 기록의 IP, 방문 수단, 시각을 그대로 돌려준다', async () => {
    const postId = await insertPost('Notes/post-view-record.md');
    const view = buildView({ postId, viewedAt: '2026-11-21T10:00:00.000Z' });

    await postViews.insert(view);
    const latest = await postViews.findLatest({ postId, ip: '203.0.113.1' });

    expect(latest?.unpack()).toEqual(view.unpack());
  });

  it('같은 post와 IP의 방문 기록 중 가장 늦은 것을 돌려준다', async () => {
    const postId = await insertPost('Notes/post-view-latest.md');
    await postViews.insert(buildView({ postId, viewedAt: '2026-11-21T11:00:00.000Z' }));
    await postViews.insert(buildView({ postId, viewedAt: '2026-11-21T10:00:00.000Z' }));
    await postViews.insert(buildView({ postId, ip: '203.0.113.2', viewedAt: '2026-11-21T12:00:00.000Z' }));

    const latest = await postViews.findLatest({ postId, ip: '203.0.113.1' });

    expect(latest?.unpack().viewedAt).toEqual(new Date('2026-11-21T11:00:00.000Z'));
  });

  it('방문 기록이 없으면 null을 돌려준다', async () => {
    const postId = await insertPost('Notes/post-view-none.md');

    expect(await postViews.findLatest({ postId, ip: '203.0.113.1' })).toBeNull();
  });
});
