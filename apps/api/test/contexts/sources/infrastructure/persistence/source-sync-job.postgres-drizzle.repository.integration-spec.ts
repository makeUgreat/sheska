import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { SourceSyncJob } from '@contexts/sources/domain';
import {
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/sources/application/ports';
import { SOURCES_TOKENS } from '@contexts/sources/sources.tokens';
import { AppModule } from '@platform/nest/app.module';
import { createSourceFixture } from '../../fixtures/source.fixture';
import { createTestNestApp } from '../../../../support/nest-test-app';

describe('SourceSyncJobDrizzleRepository', () => {
  let app: INestApplication;
  let sourceRepository: SourceRepository;
  let repository: SourceSyncJobRepository;

  beforeAll(async () => {
    app = await createTestNestApp(AppModule);
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
    const source = createSourceFixture({
      externalSourceId: 'Notes/sync-job-source.md',
    });
    await sourceRepository.save(source);
    const syncJob = SourceSyncJob.create({
      sourceId: source.id,
      fingerprint: 'fingerprint-2',
    })._unsafeUnwrap();

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
    const syncJob = SourceSyncJob.create({
      sourceId: 'unknown-source',
      fingerprint: 'fingerprint-1',
    })._unsafeUnwrap();

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
