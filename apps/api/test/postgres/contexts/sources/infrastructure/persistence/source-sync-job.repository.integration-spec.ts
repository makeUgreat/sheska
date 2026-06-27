import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/sources/application/ports';
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

    expect(result.isOk()).toBe(true);

    if (result.isOk()) {
      expect(result.value.id).toBe(syncJob.id);
      expect(result.value.getProps()).toMatchObject({
        sourceId: source.id,
        status: 'pending',
      });
      expect(result.value.getProps().fingerprint.value).toBe('fingerprint-2');
    }
  });

  it('없는 sourceId로 저장하면 state conflict로 매핑한다', async () => {
    const syncJob = buildSourceSyncJob({
      sourceId: 'unknown-source',
      fingerprint: 'fingerprint-1',
    });

    const result = await repository.save(syncJob);

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error.kind).toBe('state_conflict');
      expect(result.error.code).toBe(
        'source_sync_job_repository.state_conflict',
      );
    }
  });
});
