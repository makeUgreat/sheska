import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/sources/domain';
import {
  SOURCE_REPOSITORY,
  SOURCE_SYNC_JOB_REPOSITORY,
} from '@contexts/sources/sources.di-tokens';
import { AppModule } from '@platform/nest/app.module';
import { buildSourceSyncJob } from '../../../support/domains/fixtures/source-sync-job.fixture';
import { buildSource } from '../../../support/domains/fixtures/source.fixture';

describe('SourceSyncJobDrizzleRepository', () => {
  let app: INestApplication;
  let sourceRepository: SourceRepository;
  let repository: SourceSyncJobRepository;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    sourceRepository = app.get<SourceRepository>(SOURCE_REPOSITORY);
    repository = app.get<SourceSyncJobRepository>(SOURCE_SYNC_JOB_REPOSITORY);
  });

  afterAll(async () => {
    await app.close();
  });

  it('sync job을 저장한다', async () => {
    const source = buildSource({
      externalSourceId: 'Notes/sync-job-source.md',
    });
    await sourceRepository.save(source);
    const syncJob = buildSourceSyncJob({
      sourceId: source.id,
      fingerprint: 'fingerprint-2',
    });

    const result = await repository.save(syncJob);

    expect(result.id).toBe(syncJob.id);
    expect(result.getProps()).toMatchObject({
      sourceId: source.id,
      status: 'pending',
    });
    expect(result.getProps().fingerprint.unpack()).toBe('fingerprint-2');
  });

  it('없는 sourceId로 저장하면 exception으로 전파한다', async () => {
    const syncJob = buildSourceSyncJob({
      sourceId: 'unknown-source',
      fingerprint: 'fingerprint-1',
    });

    await expect(repository.save(syncJob)).rejects.toMatchObject({
      kind: 'conflict',
      code: 'source_sync_job.save_failed',
    });
  });

  it('같은 sourceId와 fingerprint의 active sync job은 하나만 저장한다', async () => {
    const source = buildSource({
      externalSourceId: 'Notes/sync-job-active-unique.md',
    });
    await sourceRepository.save(source);
    const first = buildSourceSyncJob({
      sourceId: source.id,
      fingerprint: 'fingerprint-active',
    });
    const second = buildSourceSyncJob({
      sourceId: source.id,
      fingerprint: 'fingerprint-active',
    });
    await repository.save(first);

    await expect(repository.save(second)).rejects.toMatchObject({
      kind: 'conflict',
      code: 'source_sync_job.save_failed',
    });
  });

  it('기존 sync job이 종료되면 같은 sourceId와 fingerprint로 새 job을 저장한다', async () => {
    const source = buildSource({
      externalSourceId: 'Notes/sync-job-retry-after-completed.md',
    });
    await sourceRepository.save(source);
    const first = buildSourceSyncJob({
      sourceId: source.id,
      fingerprint: 'fingerprint-retry',
    });
    await repository.save(first);
    first.markCompleted();
    await repository.save(first);
    const second = buildSourceSyncJob({
      sourceId: source.id,
      fingerprint: 'fingerprint-retry',
    });

    await expect(repository.save(second)).resolves.toMatchObject({
      id: second.id,
    });
  });

  it('sourceId로 가장 최근 sync job을 반환한다', async () => {
    const source = buildSource({
      externalSourceId: 'Notes/sync-job-latest.md',
    });
    await sourceRepository.save(source);
    const first = buildSourceSyncJob({
      sourceId: source.id,
      fingerprint: 'fingerprint-first',
    });
    const second = buildSourceSyncJob({
      sourceId: source.id,
      fingerprint: 'fingerprint-second',
    });
    await repository.save(first);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await repository.save(second);

    const result = await repository.findLatest({
      sourceId: source.id,
    });

    expect(result?.id).toBe(second.id);
  });

  it('sync job이 없으면 null을 반환한다', async () => {
    const result = await repository.findLatest({
      sourceId: 'non-existent-source',
    });

    expect(result).toBeNull();
  });
});
