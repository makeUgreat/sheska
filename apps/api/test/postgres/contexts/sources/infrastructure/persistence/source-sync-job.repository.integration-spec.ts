import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/sources/domain';
import { SOURCES_TOKENS } from '@contexts/sources/sources.tokens';
import { AppModule } from '@platform/nest/app.module';
import { buildSourceSyncJob } from '../../../../../contexts/sources/fixtures/source-sync-job.fixture';
import { buildSource } from '../../../../../contexts/sources/fixtures/source.fixture';

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
    sourceRepository = app.get<SourceRepository>(
      SOURCES_TOKENS.sourceRepository,
    );
    repository = app.get<SourceSyncJobRepository>(
      SOURCES_TOKENS.sourceSyncJobRepository,
    );
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

    await expect(repository.save(syncJob)).rejects.toThrow(
      'Source Sync Job Repository operation failed',
    );
  });
});
