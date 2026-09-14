import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createOutboxEvent } from '@kernels/application';
import { type SourcesUnitOfWork } from '@contexts/sources/application/ports';
import {
  SOURCE_SYNC_JOB_CREATED_EVENT_TYPE,
  SOURCE_SYNC_JOB_CREATED_EVENT_VERSION,
  type SourceSyncJobCreatedOutboxEvent,
} from '@contexts/sources/application/events/source-sync-job-created.outbox-event';
import {
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/sources/domain';
import {
  SOURCE_REPOSITORY,
  SOURCE_SYNC_JOB_REPOSITORY,
  SOURCES_UNIT_OF_WORK,
} from '@contexts/sources/sources.di-tokens';
import { AppModule } from '@platform/nest/app.module';
import { DATABASE_TOKENS, outboxMessages } from '@kernels/infrastructure';
import * as schema from '@contexts/sources/infrastructure/persistence/postgres-drizzle/schema';
import { buildSourceSyncJob } from '../../../support/domains/fixtures/source-sync-job.fixture';
import { buildSource } from '../../../support/domains/fixtures/source.fixture';

describe('SourcesPgDrizzleUnitOfWork', () => {
  let app: INestApplication;
  let unitOfWork: SourcesUnitOfWork;
  let database: NodePgDatabase<typeof schema>;
  let sources: SourceRepository;
  let syncJobs: SourceSyncJobRepository;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    unitOfWork = app.get<SourcesUnitOfWork>(SOURCES_UNIT_OF_WORK);
    database = app.get<NodePgDatabase<typeof schema>>(
      DATABASE_TOKENS.drizzleDatabase,
    );
    sources = app.get<SourceRepository>(SOURCE_REPOSITORY);
    syncJobs = app.get<SourceSyncJobRepository>(SOURCE_SYNC_JOB_REPOSITORY);
  });

  afterAll(async () => {
    await app.close();
  });

  it('source와 sync job을 하나의 transaction으로 commit한다', async () => {
    const source = buildSource({
      externalSourceId: 'Notes/unit-of-work-commit.md',
    });
    const syncJob = buildSourceSyncJob({
      sourceId: source.id,
      fingerprint: 'unit-of-work-commit',
    });

    await unitOfWork.execute(async (resources) => {
      await resources.sources.save(source);
      await resources.syncJobs.save(syncJob);
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
      fingerprint: 'unit-of-work-rollback',
    });
    const conflictingSyncJob = buildSourceSyncJob({
      sourceId: source.id,
      fingerprint: 'unit-of-work-rollback',
    });
    const event: SourceSyncJobCreatedOutboxEvent = createOutboxEvent({
      eventType: SOURCE_SYNC_JOB_CREATED_EVENT_TYPE,
      eventVersion: SOURCE_SYNC_JOB_CREATED_EVENT_VERSION,
      occurredAt: new Date(),
      payload: {
        sourceId: source.id,
        syncJobId: firstSyncJob.id,
        content: '# Source note',
      },
    });

    await expect(
      unitOfWork.execute(async (resources) => {
        await resources.sources.save(source);
        await resources.syncJobs.save(firstSyncJob);
        await resources.outbox.append(event);
        await resources.syncJobs.save(conflictingSyncJob);
      }),
    ).rejects.toMatchObject({
      kind: 'conflict',
      code: 'source_sync_job.save_failed',
    });

    await expect(sources.find({ id: source.id })).resolves.toBeNull();
    await expect(syncJobs.find({ id: firstSyncJob.id })).resolves.toBeNull();
    const persistedMessages = await database
      .select()
      .from(outboxMessages)
      .where(eq(outboxMessages.eventId, event.eventId));
    expect(persistedMessages).toHaveLength(0);
  });
});
