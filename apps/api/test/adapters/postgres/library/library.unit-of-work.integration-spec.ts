import { type TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type LibraryUnitOfWork } from '@contexts/library/application/ports';
import { SourceSyncJobCreatedIntegrationEvent } from '@contexts/library/application/events/source-sync-job-created.integration-event';
import { type SourceRepository, type SourceSyncJobRepository } from '@contexts/library/domain';
import { SOURCE_REPOSITORY, SOURCE_SYNC_JOB_REPOSITORY, LIBRARY_UNIT_OF_WORK } from '@contexts/library/library.di-tokens';
import { SourcePgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/source.pg-drizzle.repository';
import { SourceSyncJobPgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/source-sync-job.pg-drizzle.repository';
import { LibraryPgDrizzleUnitOfWork } from '@contexts/library/infrastructure/persistence/postgres-drizzle/library.pg-drizzle.unit-of-work';
import { DATABASE_TOKENS, outboxMessages } from '@kernels/infrastructure';
import * as schema from '@contexts/library/infrastructure/persistence/postgres-drizzle/schema';
import { buildSourceSyncJob } from '../../../support/domains/fixtures/source-sync-job.fixture';
import { buildSource } from '../../../support/domains/fixtures/source.fixture';
import { setupPostgresTestingModule } from '../support/setup-postgres-testing-module';

describe('LibraryPgDrizzleUnitOfWork', () => {
  let testingModule: TestingModule;
  let unitOfWork: LibraryUnitOfWork;
  let database: NodePgDatabase<typeof schema>;
  let sources: SourceRepository;
  let syncJobs: SourceSyncJobRepository;

  beforeAll(async () => {
    testingModule = await setupPostgresTestingModule([
      { provide: SOURCE_REPOSITORY, useClass: SourcePgDrizzleRepository },
      { provide: SOURCE_SYNC_JOB_REPOSITORY, useClass: SourceSyncJobPgDrizzleRepository },
      { provide: LIBRARY_UNIT_OF_WORK, useClass: LibraryPgDrizzleUnitOfWork },
    ]);
    unitOfWork = testingModule.get<LibraryUnitOfWork>(LIBRARY_UNIT_OF_WORK);
    database = testingModule.get<NodePgDatabase<typeof schema>>(DATABASE_TOKENS.drizzleDatabase);
    sources = testingModule.get<SourceRepository>(SOURCE_REPOSITORY);
    syncJobs = testingModule.get<SourceSyncJobRepository>(SOURCE_SYNC_JOB_REPOSITORY);
  });

  afterAll(async () => {
    await testingModule.close();
  });

  it('source와 sync job을 하나의 transaction으로 commit한다', async () => {
    const source = buildSource({
      externalSourceId: 'Notes/unit-of-work-commit.md',
    });
    const syncJob = buildSourceSyncJob({
      sourceId: source.id,
      content: 'unit-of-work-commit',
    });

    await unitOfWork.execute(async (resources) => {
      await resources.sources.insert(source);
      await resources.syncJobs.insert(syncJob);
    });

    await expect(sources.find({ id: source.id })).resolves.toMatchObject({
      id: source.id,
    });
    await expect(syncJobs.find({ id: syncJob.id })).resolves.toMatchObject({
      id: syncJob.id,
    });
  });

  it('두 번째 repository 저장이 실패하면 먼저 저장한 내용도 rollback한다', async () => {
    const source = buildSource({
      externalSourceId: 'Notes/unit-of-work-rollback.md',
    });
    const firstSyncJob = buildSourceSyncJob({
      sourceId: source.id,
      content: 'unit-of-work-rollback',
    });
    const conflictingSyncJob = buildSourceSyncJob({
      sourceId: source.id,
      content: 'unit-of-work-rollback',
    });
    const event = new SourceSyncJobCreatedIntegrationEvent({
      occurredAt: new Date(),
      sourceId: source.id,
      syncJobId: firstSyncJob.id,
      content: '# Source note',
    });

    await expect(
      unitOfWork.execute(async (resources) => {
        await resources.sources.insert(source);
        await resources.syncJobs.insert(firstSyncJob);
        await resources.outbox.append(event);
        await resources.syncJobs.insert(conflictingSyncJob);
      }),
    ).rejects.toMatchObject({
      kind: 'constraint_violation',
      code: 'source_sync_job.already_active',
    });

    await expect(sources.find({ id: source.id })).resolves.toBeNull();
    await expect(syncJobs.find({ id: firstSyncJob.id })).resolves.toBeNull();
    const persistedMessages = await database.select().from(outboxMessages).where(eq(outboxMessages.eventId, event.eventId));
    expect(persistedMessages).toHaveLength(0);
  });
});
