import { type INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type Queue } from 'bullmq';
import {
  DATABASE_TOKENS,
  OutboxRelay,
  outboxMessages,
} from '@kernels/infrastructure';
import { type SourceFingerprinter } from '@contexts/library/application/ports';
import {
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/library/domain';
import {
  SOURCE_EMBEDDING_CHUNK_QUEUE,
  SOURCE_EMBEDDING_FINALIZATION_QUEUE,
} from '@contexts/ingestion/application/ports';
import { UploadSourceUseCase } from '@contexts/library/application/use-cases/upload-source.use-case';
import * as schema from '@contexts/library/infrastructure/persistence/postgres-drizzle/schema';
import * as ingestionSchema from '@contexts/ingestion/infrastructure/persistence/postgres-drizzle/schema';
import {
  SOURCE_FINGERPRINTER,
  SOURCE_REPOSITORY,
  SOURCE_SYNC_JOB_REPOSITORY,
} from '@contexts/library/library.di-tokens';
import { AppModule } from '@platform/nest/app.module';
import { sourceContentByteSize } from '../../../support/domains/fixtures/source.fixture';
import { VALID_EMBEDDING } from '../../../support/domains/fixtures/source-embedding.fixture';

describe('UploadSourceUseCase', () => {
  let app: INestApplication;
  let database: NodePgDatabase<typeof schema>;
  let sources: SourceRepository;
  let syncJobs: SourceSyncJobRepository;
  let useCase: UploadSourceUseCase;
  let outboxRelay: OutboxRelay;
  let embeddingChunksQueue: Queue;
  let embeddingFinalizeQueue: Queue;
  const fingerprints = new Map<string, string>();
  const sourceFingerprinter: SourceFingerprinter = {
    calculate(content: string) {
      const fingerprint = fingerprints.get(content);

      if (!fingerprint) {
        throw new Error(`Missing test fingerprint for content: ${content}`);
      }

      return Promise.resolve(fingerprint);
    },
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SOURCE_FINGERPRINTER)
      .useValue(sourceFingerprinter)
      .compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    embeddingChunksQueue = app.get<Queue>(
      getQueueToken(SOURCE_EMBEDDING_CHUNK_QUEUE),
    );
    embeddingFinalizeQueue = app.get<Queue>(
      getQueueToken(SOURCE_EMBEDDING_FINALIZATION_QUEUE),
    );
    await embeddingChunksQueue.pause();
    await embeddingFinalizeQueue.pause();
    database = app.get<NodePgDatabase<typeof schema>>(
      DATABASE_TOKENS.drizzleDatabase,
    );
    sources = app.get<SourceRepository>(SOURCE_REPOSITORY);
    syncJobs = app.get<SourceSyncJobRepository>(SOURCE_SYNC_JOB_REPOSITORY);
    useCase = app.get(UploadSourceUseCase);
    outboxRelay = app.get(OutboxRelay);
  });

  beforeEach(() => {
    fingerprints.clear();
  });

  afterAll(async () => {
    await embeddingChunksQueue.obliterate({ force: true });
    await embeddingFinalizeQueue.obliterate({ force: true });
    await app.close();
  });

  it('새 source를 저장하고 sync job을 생성한다', async () => {
    const externalSourceId = 'Notes/upload-usecase-new-source.md';
    const content = '# Source note';
    const fingerprint = useFingerprint(content, 'fingerprint-new-source');

    const result = await useCase.execute({ externalSourceId, content });

    expect(result).toMatchObject({
      externalSourceId,
      fingerprint,
    });
    expect(result.sourceId.length).toBeGreaterThan(0);
    expect(result.syncJobId?.length).toBeGreaterThan(0);

    const source = await sources.find({ externalSourceId });
    expect(source?.id).toBe(result.sourceId);
    expect(source?.getProps().contentSnapshot.unpack()).toEqual({
      body: content,
      frontmatter: {},
      title: externalSourceId,
      fingerprint,
      size: sourceContentByteSize(content),
    });

    const [syncJob] = await findSyncJobsBySourceId(result.sourceId);

    expect(syncJob).toMatchObject({
      id: result.syncJobId,
      sourceId: result.sourceId,
      fingerprint,
      status: 'waiting',
    });

    const persistedMessages = await database
      .select()
      .from(outboxMessages)
      .where(eq(outboxMessages.eventType, 'source.sync_job.created'));
    const outboxMessage = persistedMessages.find(
      (message) =>
        (message.payload as { syncJobId?: string }).syncJobId ===
        result.syncJobId,
    );

    expect(outboxMessage).toMatchObject({
      eventType: 'source.sync_job.created',
      eventVersion: 1,
      payload: {
        sourceId: result.sourceId,
        syncJobId: result.syncJobId,
        content,
      },
    });
    expect(outboxMessage?.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );

    await outboxRelay.relayPending();

    const [publishedEvent] = await database
      .select()
      .from(outboxMessages)
      .where(eq(outboxMessages.eventId, outboxMessage!.eventId));
    expect(publishedEvent?.publishedAt).toBeInstanceOf(Date);

    const queuedJob = await embeddingChunksQueue.getJob(
      `${result.syncJobId!}-0`,
    );
    expect(queuedJob?.data).toEqual({
      sourceId: result.sourceId,
      syncJobId: result.syncJobId,
      chunkIndex: 0,
      chunkContent: content,
    });
  });

  it('같은 content를 다시 업로드할 때 active sync job을 재사용한다', async () => {
    const externalSourceId = 'Notes/upload-usecase-unchanged-no-embedding.md';
    const content = '# Same source note';
    const fingerprint = useFingerprint(content, 'fingerprint-unchanged-source');
    const firstResult = await useCase.execute({ externalSourceId, content });

    const secondResult = await useCase.execute({ externalSourceId, content });

    expect(secondResult).toMatchObject({
      sourceId: firstResult.sourceId,
      externalSourceId,
      fingerprint,
      syncJobId: firstResult.syncJobId,
    });

    const persistedSyncJobs = await findSyncJobsBySourceId(
      firstResult.sourceId,
    );

    expect(persistedSyncJobs).toHaveLength(1);
  });

  it('frontmatter 전체와 body를 분리하고 body만 임베딩 대상으로 전달한다', async () => {
    const externalSourceId = 'Notes/upload-usecase-frontmatter.md';
    const content = `---
title: Retry Amplification
aliases:
  - Nested Retries
custom:
  status: draft
---
# Retry body`;
    const fingerprint = useFingerprint(content, 'fingerprint-frontmatter');

    const result = await useCase.execute({ externalSourceId, content });

    const source = await sources.get({ id: result.sourceId });
    expect(source.getProps().contentSnapshot.unpack()).toEqual({
      body: '# Retry body',
      frontmatter: {
        title: 'Retry Amplification',
        aliases: ['Nested Retries'],
        custom: { status: 'draft' },
      },
      title: 'Retry Amplification',
      fingerprint,
      size: sourceContentByteSize(content),
    });

    const messages = await database
      .select()
      .from(outboxMessages)
      .where(eq(outboxMessages.eventType, 'source.sync_job.created'));
    const message = messages.find(
      (candidate) =>
        (candidate.payload as { syncJobId?: string }).syncJobId ===
        result.syncJobId,
    );
    expect(message?.payload).toMatchObject({ content: '# Retry body' });
  });

  it('같은 content를 다시 업로드할 때 임베딩이 최신이면 저장 갱신과 sync job 생성을 건너뛴다', async () => {
    const externalSourceId = 'Notes/upload-usecase-unchanged-with-embedding.md';
    const content = '# Same source note with embedding';
    const fingerprint = useFingerprint(
      content,
      'fingerprint-unchanged-with-embedding',
    );
    const firstResult = await useCase.execute({ externalSourceId, content });

    await database.insert(ingestionSchema.sourceEmbeddings).values({
      sourceId: firstResult.sourceId,
      chunkIndex: 0,
      chunkContent: 'existing chunk',
      embedding: VALID_EMBEDDING,
      model: 'qwen3-embedding:0.6b',
    });
    const firstSyncJob = await syncJobs.findLatest({
      sourceId: firstResult.sourceId,
    });
    firstSyncJob!.markCompleted(1);
    await syncJobs.save(firstSyncJob!);

    const secondResult = await useCase.execute({ externalSourceId, content });

    expect(secondResult).toEqual({
      sourceId: firstResult.sourceId,
      externalSourceId,
      fingerprint,
    });

    const persistedSyncJobs = await findSyncJobsBySourceId(
      firstResult.sourceId,
    );

    expect(persistedSyncJobs).toHaveLength(1);
  });

  it('다른 content를 다시 업로드하면 source를 갱신하고 sync job을 추가한다', async () => {
    const externalSourceId = 'Notes/upload-usecase-changed-source.md';
    const oldContent = '# Old source note';
    const newContent = '# New source note';
    const oldFingerprint = useFingerprint(oldContent, 'fingerprint-old-source');
    const newFingerprint = useFingerprint(newContent, 'fingerprint-new-source');
    const firstResult = await useCase.execute({
      externalSourceId,
      content: oldContent,
    });

    const secondResult = await useCase.execute({
      externalSourceId,
      content: newContent,
    });

    expect(secondResult).toMatchObject({
      sourceId: firstResult.sourceId,
      externalSourceId,
      fingerprint: newFingerprint,
    });
    expect(secondResult.syncJobId?.length).toBeGreaterThan(0);

    const source = await sources.find({ externalSourceId });
    expect(source?.getProps().contentSnapshot.unpack()).toEqual({
      body: newContent,
      frontmatter: {},
      title: externalSourceId,
      fingerprint: newFingerprint,
      size: sourceContentByteSize(newContent),
    });

    const persistedSyncJobs = await findSyncJobsBySourceId(
      firstResult.sourceId,
    );

    expect(persistedSyncJobs).toHaveLength(2);
    expect(persistedSyncJobs.map((syncJob) => syncJob.fingerprint)).toEqual(
      expect.arrayContaining([oldFingerprint, newFingerprint]),
    );
  });

  function useFingerprint(content: string, fingerprint: string) {
    fingerprints.set(content, fingerprint);

    return fingerprint;
  }

  async function findSyncJobsBySourceId(sourceId: string) {
    return database
      .select()
      .from(schema.sourceSyncJobs)
      .where(eq(schema.sourceSyncJobs.sourceId, sourceId));
  }
});
