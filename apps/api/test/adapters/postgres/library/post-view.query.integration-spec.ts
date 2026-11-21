import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type TestingModule } from '@nestjs/testing';
import { type PostViewQuery } from '@contexts/library/application/ports';
import { PostView, PostViewClient, type PostRepository, type PostViewRepository, type SourceRepository } from '@contexts/library/domain';
import { POST_REPOSITORY, POST_VIEW_QUERY, POST_VIEW_REPOSITORY, SOURCE_REPOSITORY } from '@contexts/library/library.di-tokens';
import { SourcePgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/source.pg-drizzle.repository';
import { PostPgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/post.pg-drizzle.repository';
import { PostViewPgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/post-view.pg-drizzle.repository';
import { PostViewPgDrizzleQuery } from '@contexts/library/infrastructure/persistence/postgres-drizzle/post-view.pg-drizzle.query';
import { buildPost } from '../../../support/domains/fixtures/post.fixture';
import { buildSource } from '../../../support/domains/fixtures/source.fixture';
import { setupPostgresTestingModule } from '../support/setup-postgres-testing-module';

describe('PostViewPgDrizzleQuery', () => {
  let testingModule: TestingModule;
  let postViewQuery: PostViewQuery;
  let postViews: PostViewRepository;
  let posts: PostRepository;
  let sources: SourceRepository;

  beforeAll(async () => {
    testingModule = await setupPostgresTestingModule([
      { provide: SOURCE_REPOSITORY, useClass: SourcePgDrizzleRepository },
      { provide: POST_REPOSITORY, useClass: PostPgDrizzleRepository },
      { provide: POST_VIEW_REPOSITORY, useClass: PostViewPgDrizzleRepository },
      { provide: POST_VIEW_QUERY, useClass: PostViewPgDrizzleQuery },
    ]);
    postViewQuery = testingModule.get<PostViewQuery>(POST_VIEW_QUERY);
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

  async function insertView(postId: string, ip: string, viewedAt: string): Promise<void> {
    await postViews.insert(PostView.of({ postId, ip, client: PostViewClient.of('Mozilla/5.0'), viewedAt: new Date(viewedAt) }));
  }

  it('조회내역을 최신순으로 돌려주고 다른 post의 기록은 섞지 않는다', async () => {
    const postId = await insertPost('Notes/post-view-query-order.md');
    const otherPostId = await insertPost('Notes/post-view-query-other.md');
    await insertView(postId, '203.0.113.1', '2026-11-21T09:00:00.000Z');
    await insertView(postId, '203.0.113.2', '2026-11-21T11:00:00.000Z');
    await insertView(otherPostId, '203.0.113.3', '2026-11-21T12:00:00.000Z');

    const { views, nextCursor } = await postViewQuery.paginate({ postId, cursor: null, limit: 20 });

    expect(views).toEqual([
      { viewedAt: new Date('2026-11-21T11:00:00.000Z'), ip: '203.0.113.2', client: 'Mozilla/5.0' },
      { viewedAt: new Date('2026-11-21T09:00:00.000Z'), ip: '203.0.113.1', client: 'Mozilla/5.0' },
    ]);
    expect(nextCursor).toBeNull();
  });

  it('nextCursor로 다음 페이지를 이어 받고, 같은 시각의 기록도 빠뜨리거나 겹치지 않는다', async () => {
    const postId = await insertPost('Notes/post-view-query-cursor.md');
    await insertView(postId, '203.0.113.1', '2026-11-21T10:00:00.000Z');
    await insertView(postId, '203.0.113.2', '2026-11-21T10:00:00.000Z');
    await insertView(postId, '203.0.113.3', '2026-11-21T10:00:00.000Z');

    const first = await postViewQuery.paginate({ postId, cursor: null, limit: 2 });
    const second = await postViewQuery.paginate({ postId, cursor: first.nextCursor, limit: 2 });

    expect(first.views.map((view) => view.ip)).toEqual(['203.0.113.3', '203.0.113.2']);
    expect(second.views.map((view) => view.ip)).toEqual(['203.0.113.1']);
    expect(second.nextCursor).toBeNull();
  });

  it('조회내역이 없으면 빈 목록을 돌려준다', async () => {
    const postId = await insertPost('Notes/post-view-query-empty.md');

    expect(await postViewQuery.paginate({ postId, cursor: null, limit: 20 })).toEqual({ views: [], nextCursor: null });
  });
});
