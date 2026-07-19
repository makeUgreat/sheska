import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { type SourceQuery } from '@contexts/sources/application/ports';
import {
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/sources/domain';
import {
  SOURCE_QUERY,
  SOURCE_REPOSITORY,
  SOURCE_SYNC_JOB_REPOSITORY,
} from '@contexts/sources/sources.di-tokens';
import { AppModule } from '@platform/nest/app.module';
import { buildSource } from '../../../support/domains/fixtures/source.fixture';
import { buildSourceSyncJob } from '../../../support/domains/fixtures/source-sync-job.fixture';

describe('SourcePgDrizzleQuery', () => {
  let app: INestApplication;
  let sourceQuery: SourceQuery;
  let sources: SourceRepository;
  let syncJobs: SourceSyncJobRepository;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    sourceQuery = app.get<SourceQuery>(SOURCE_QUERY);
    sources = app.get<SourceRepository>(SOURCE_REPOSITORY);
    syncJobs = app.get<SourceSyncJobRepository>(SOURCE_SYNC_JOB_REPOSITORY);
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

    const { sources: result } = await sourceQuery.paginate();

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

    const { sources: result } = await sourceQuery.paginate();

    const found = result.find((s) => s.sourceId === source.id);
    expect(found).toBeDefined();
    expect(found?.latestSyncJob).toMatchObject({
      syncJobId: syncJob.id,
      status: 'pending',
    });
  });

  it('sync job이 없는 source의 latestSyncJob은 null이다', async () => {
    const source = await sources.save(
      buildSource({ externalSourceId: 'Notes/sq-no-sync-job.md' }),
    );

    const { sources: result } = await sourceQuery.paginate();

    const found = result.find((s) => s.sourceId === source.id);
    expect(found).toBeDefined();
    expect(found?.latestSyncJob).toBeNull();
  });

  describe('paginate — cursor pagination', () => {
    it('limit보다 많은 source가 있으면 nextCursor를 반환한다', async () => {
      await sources.save(
        buildSource({ externalSourceId: 'Notes/sq-cursor-1.md' }),
      );
      await sources.save(
        buildSource({ externalSourceId: 'Notes/sq-cursor-2.md' }),
      );
      await sources.save(
        buildSource({ externalSourceId: 'Notes/sq-cursor-3.md' }),
      );

      const { sources: result, nextCursor } = await sourceQuery.paginate({
        limit: 2,
      });

      expect(result).toHaveLength(2);
      expect(nextCursor).not.toBeNull();
    });

    it('nextCursor로 다음 페이지를 가져온다', async () => {
      const s1 = await sources.save(
        buildSource({ externalSourceId: 'Notes/sq-cursor-page-1.md' }),
      );
      const s2 = await sources.save(
        buildSource({ externalSourceId: 'Notes/sq-cursor-page-2.md' }),
      );
      const s3 = await sources.save(
        buildSource({ externalSourceId: 'Notes/sq-cursor-page-3.md' }),
      );

      const firstPage = await sourceQuery.paginate({ limit: 2 });
      const secondPage = await sourceQuery.paginate({
        limit: 2,
        cursor: firstPage.nextCursor!,
      });

      const firstIds = firstPage.sources.map((s) => s.sourceId);
      const secondIds = secondPage.sources.map((s) => s.sourceId);
      expect(firstIds).toHaveLength(2);
      expect(secondIds.length).toBeGreaterThanOrEqual(1);
      expect(firstIds.some((id) => secondIds.includes(id))).toBe(false);

      const allIds = [...firstIds, ...secondIds];
      expect(allIds).toContain(s1.id);
      expect(allIds).toContain(s2.id);
      expect(allIds).toContain(s3.id);
    });

    it('마지막 source 이후의 cursor로 조회하면 nextCursor가 null이다', async () => {
      const veryOldCursor = {
        createdAt: new Date('2000-01-01T00:00:00.000Z'),
        id: 'z',
      };

      const { sources: result, nextCursor } = await sourceQuery.paginate({
        limit: 10,
        cursor: veryOldCursor,
      });

      expect(result).toHaveLength(0);
      expect(nextCursor).toBeNull();
    });

    it('cursor와 동일한 createdAt + id를 가진 source는 결과에서 제외된다', async () => {
      const source = await sources.save(
        buildSource({ externalSourceId: 'Notes/sq-cursor-tie.md' }),
      );

      const { sources: saved } = await sourceQuery.paginate({ limit: 100 });
      const savedSource = saved.find((s) => s.sourceId === source.id)!;
      const cursor = {
        createdAt: savedSource.createdAt,
        id: savedSource.sourceId,
      };

      const { sources: result } = await sourceQuery.paginate({
        limit: 10,
        cursor,
      });

      const ids = result.map((s) => s.sourceId);
      expect(ids).not.toContain(source.id);
    });
  });
});
