import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { type SourceQuery } from '@contexts/library/application/ports';
import {
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/library/domain';
import { type PostRepository } from '@contexts/posts/domain';
import {
  SOURCE_QUERY,
  SOURCE_REPOSITORY,
  SOURCE_SYNC_JOB_REPOSITORY,
} from '@contexts/library/library.di-tokens';
import { POST_REPOSITORY } from '@contexts/posts/posts.di-tokens';
import { AppModule } from '@platform/nest/app.module';
import { buildSource } from '../../../support/domains/fixtures/source.fixture';
import { buildSourceSyncJob } from '../../../support/domains/fixtures/source-sync-job.fixture';
import { buildPost } from '../../../support/domains/fixtures/post.fixture';

describe('SourcePgDrizzleQuery', () => {
  let app: INestApplication;
  let sourceQuery: SourceQuery;
  let sources: SourceRepository;
  let syncJobs: SourceSyncJobRepository;
  let posts: PostRepository;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    sourceQuery = app.get<SourceQuery>(SOURCE_QUERY);
    sources = app.get<SourceRepository>(SOURCE_REPOSITORY);
    syncJobs = app.get<SourceSyncJobRepository>(SOURCE_SYNC_JOB_REPOSITORY);
    posts = app.get<PostRepository>(POST_REPOSITORY);
  });

  afterAll(async () => {
    await app.close();
  });

  it('source 목록을 반환한다', async () => {
    const source1 = await sources.save(
      buildSource({ externalSourceId: 'Notes/sq-list-1.md' }),
    );
    const source2 = await sources.save(
      buildSource({ externalSourceId: 'Notes/sq-list-2.md' }),
    );

    const { sources: result } = await sourceQuery.paginate({
      page: 1,
      pageSize: 20,
    });

    const ids = result.map((s) => s.sourceId);
    expect(ids).toContain(source1.id);
    expect(ids).toContain(source2.id);
  });

  it('latestSyncJob이 있는 source를 반환한다', async () => {
    const source = await sources.save(
      buildSource({ externalSourceId: 'Notes/sq-with-sync-job.md' }),
    );
    const syncJob = buildSourceSyncJob({
      sourceId: source.id,
      fingerprint: 'fingerprint-2',
    });
    await syncJobs.save(syncJob);

    const { sources: result } = await sourceQuery.paginate({
      page: 1,
      pageSize: 20,
    });

    const found = result.find((s) => s.sourceId === source.id);
    expect(found).toBeDefined();
    expect(found?.latestSyncJob).toMatchObject({
      syncJobId: syncJob.id,
      status: 'waiting',
    });
  });

  it('sync job이 없는 source의 latestSyncJob은 null이다', async () => {
    const source = await sources.save(
      buildSource({ externalSourceId: 'Notes/sq-no-sync-job.md' }),
    );

    const { sources: result } = await sourceQuery.paginate({
      page: 1,
      pageSize: 20,
    });

    const found = result.find((s) => s.sourceId === source.id);
    expect(found).toBeDefined();
    expect(found?.latestSyncJob).toBeNull();
  });

  it('post가 게시된 source의 publishedPostId를 반환한다', async () => {
    const source = await sources.save(
      buildSource({ externalSourceId: 'Notes/sq-published.md' }),
    );
    const post = buildPost({ sourceId: source.id });
    await posts.save(post);

    const { sources: result } = await sourceQuery.paginate({
      page: 1,
      pageSize: 20,
    });

    const found = result.find((s) => s.sourceId === source.id);
    expect(found?.publishedPostId).toBe(post.id);
  });

  it('post가 없는 source의 publishedPostId는 null이다', async () => {
    const source = await sources.save(
      buildSource({ externalSourceId: 'Notes/sq-not-published.md' }),
    );

    const { sources: result } = await sourceQuery.paginate({
      page: 1,
      pageSize: 20,
    });

    const found = result.find((s) => s.sourceId === source.id);
    expect(found?.publishedPostId).toBeNull();
  });

  describe('find', () => {
    it('post가 게시된 source는 postId를 반환한다', async () => {
      const source = await sources.save(
        buildSource({ externalSourceId: 'Notes/sq-find-published.md' }),
      );
      const post = buildPost({ sourceId: source.id });
      await posts.save(post);

      const result = await sourceQuery.find({ sourceId: source.id });

      expect(result).toBe(post.id);
    });

    it('post가 없는 source는 null을 반환한다', async () => {
      const source = await sources.save(
        buildSource({ externalSourceId: 'Notes/sq-find-not-published.md' }),
      );

      const result = await sourceQuery.find({ sourceId: source.id });

      expect(result).toBeNull();
    });
  });

  describe('paginate — page pagination', () => {
    it('pageSize보다 많은 source가 있으면 totalPages가 1보다 크다', async () => {
      await sources.save(
        buildSource({ externalSourceId: 'Notes/sq-page-1.md' }),
      );
      await sources.save(
        buildSource({ externalSourceId: 'Notes/sq-page-2.md' }),
      );
      await sources.save(
        buildSource({ externalSourceId: 'Notes/sq-page-3.md' }),
      );

      const { sources: result, totalPages } = await sourceQuery.paginate({
        page: 1,
        pageSize: 2,
      });

      expect(result).toHaveLength(2);
      expect(totalPages).toBeGreaterThan(1);
    });

    it('다음 page를 요청하면 다른 source들이 반환된다', async () => {
      const s1 = await sources.save(
        buildSource({ externalSourceId: 'Notes/sq-page-list-1.md' }),
      );
      const s2 = await sources.save(
        buildSource({ externalSourceId: 'Notes/sq-page-list-2.md' }),
      );
      const s3 = await sources.save(
        buildSource({ externalSourceId: 'Notes/sq-page-list-3.md' }),
      );

      const firstPage = await sourceQuery.paginate({ page: 1, pageSize: 2 });
      const secondPage = await sourceQuery.paginate({ page: 2, pageSize: 2 });

      const firstIds = firstPage.sources.map((s) => s.sourceId);
      const secondIds = secondPage.sources.map((s) => s.sourceId);
      expect(firstIds).toHaveLength(2);
      expect(firstIds.some((id) => secondIds.includes(id))).toBe(false);

      const allIds = [...firstIds, ...secondIds];
      expect(allIds).toContain(s1.id);
      expect(allIds).toContain(s2.id);
      expect(allIds).toContain(s3.id);
    });

    it('마지막 page 이후를 조회하면 빈 배열을 반환한다', async () => {
      const { sources: result } = await sourceQuery.paginate({
        page: 1_000_000,
        pageSize: 10,
      });

      expect(result).toHaveLength(0);
    });

    it('totalCount를 정확히 반환한다', async () => {
      await sources.save(
        buildSource({ externalSourceId: 'Notes/sq-total-count.md' }),
      );

      const { totalCount, sources: firstPage } = await sourceQuery.paginate({
        page: 1,
        pageSize: 1,
      });

      expect(totalCount).toBeGreaterThanOrEqual(1);
      expect(firstPage).toHaveLength(1);
    });
  });
});
