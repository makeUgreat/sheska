import { type TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sha256Hex } from '@core/hash';
import { DATABASE_TOKENS, outboxMessages } from '@kernels/infrastructure';
import { type SourceRepository, type SourceSyncJobRepository } from '@contexts/library/domain';
import { SourceContentSnapshotCalculator } from '@contexts/library/application/services/source-content-snapshot-calculator.service';
import { UploadSourceUseCase } from '@contexts/library/application/use-cases/upload-source.use-case';
import { SourceDocumentYamlParser } from '@contexts/library/infrastructure/parser/source-document.yaml.parser';
import { LibraryPgDrizzleUnitOfWork } from '@contexts/library/infrastructure/persistence/postgres-drizzle/library.pg-drizzle.unit-of-work';
import { SourcePgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/source.pg-drizzle.repository';
import { SourceSyncJobPgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/source-sync-job.pg-drizzle.repository';
import * as schema from '@contexts/library/infrastructure/persistence/postgres-drizzle/schema';
import * as ingestionSchema from '@contexts/ingestion/infrastructure/persistence/postgres-drizzle/schema';
import {
  LIBRARY_UNIT_OF_WORK,
  SOURCE_DOCUMENT_PARSER,
  SOURCE_REPOSITORY,
  SOURCE_SYNC_JOB_REPOSITORY,
} from '@contexts/library/library.di-tokens';
import { sourceContentByteSize, sourceContentOf } from '../../../support/domains/fixtures/source.fixture';
import { VALID_EMBEDDING } from '../../../support/domains/fixtures/source-embedding.fixture';
import { setupPostgresTestingModule } from '../support/setup-postgres-testing-module';

describe('UploadSourceUseCase', () => {
  let testingModule: TestingModule;
  let database: NodePgDatabase<typeof schema>;
  let sources: SourceRepository;
  let syncJobs: SourceSyncJobRepository;
  let useCase: UploadSourceUseCase;

  beforeAll(async () => {
    testingModule = await setupPostgresTestingModule([
      { provide: SOURCE_DOCUMENT_PARSER, useClass: SourceDocumentYamlParser },
      { provide: SOURCE_REPOSITORY, useClass: SourcePgDrizzleRepository },
      { provide: SOURCE_SYNC_JOB_REPOSITORY, useClass: SourceSyncJobPgDrizzleRepository },
      { provide: LIBRARY_UNIT_OF_WORK, useClass: LibraryPgDrizzleUnitOfWork },
      SourceContentSnapshotCalculator,
      UploadSourceUseCase,
    ]);
    database = testingModule.get<NodePgDatabase<typeof schema>>(DATABASE_TOKENS.drizzleDatabase);
    sources = testingModule.get<SourceRepository>(SOURCE_REPOSITORY);
    syncJobs = testingModule.get<SourceSyncJobRepository>(SOURCE_SYNC_JOB_REPOSITORY);
    useCase = testingModule.get(UploadSourceUseCase);
  });

  afterAll(async () => {
    await testingModule.close();
  });

  // nocap: library-sync-7
  it('새 source를 저장하고 sync job을 생성한다', async () => {
    const externalSourceId = 'Notes/upload-usecase-new-source.md';
    const content = optedIntoSync('# Source note');
    const fingerprint = sha256Hex('# Source note');

    const result = await useCase.execute({ externalSourceId, content });

    expect(result).toMatchObject({
      externalSourceId,
      fingerprint,
    });
    expect(result.sourceId.length).toBeGreaterThan(0);
    expect(result.syncJobId?.length).toBeGreaterThan(0);

    const source = await sources.find({ externalSourceId });
    expect(source?.id).toBe(result.sourceId);
    expect(sourceContentOf(source!)).toEqual({
      body: '# Source note',
      fingerprint: sha256Hex('# Source note'),
      frontmatter: { sheska: true },
      title: externalSourceId,
      size: sourceContentByteSize(content),
    });

    const [syncJob] = await findSyncJobsBySourceId(result.sourceId);

    expect(syncJob).toMatchObject({
      id: result.syncJobId,
      sourceId: result.sourceId,
      fingerprint,
      status: 'waiting',
    });

    const persistedMessages = await database.select().from(outboxMessages).where(eq(outboxMessages.eventType, 'source.sync_job.created'));
    const outboxMessage = persistedMessages.find((message) => (message.payload as { syncJobId?: string }).syncJobId === result.syncJobId);

    expect(outboxMessage).toMatchObject({
      eventType: 'source.sync_job.created',
      eventVersion: 1,
      payload: {
        sourceId: result.sourceId,
        syncJobId: result.syncJobId,
        content: '# Source note',
      },
    });
    expect(outboxMessage?.eventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  // nocap: library-sync-2
  // nocap: library-sync-7
  it('같은 content를 다시 업로드할 때 active sync job을 재사용한다', async () => {
    const externalSourceId = 'Notes/upload-usecase-unchanged-no-embedding.md';
    const content = optedIntoSync('# Same source note');
    const fingerprint = sha256Hex('# Same source note');
    const firstResult = await useCase.execute({ externalSourceId, content });

    const secondResult = await useCase.execute({ externalSourceId, content });

    expect(secondResult).toMatchObject({
      sourceId: firstResult.sourceId,
      externalSourceId,
      fingerprint,
      syncJobId: firstResult.syncJobId,
    });

    const persistedSyncJobs = await findSyncJobsBySourceId(firstResult.sourceId);

    expect(persistedSyncJobs).toHaveLength(1);
  });

  // nocap: ingestion-chunk-1
  // nocap: library-sync-6
  it('frontmatter 전체와 body를 분리하고 body만 임베딩 대상과 fingerprint 입력으로 쓴다', async () => {
    const externalSourceId = 'Notes/upload-usecase-frontmatter.md';
    const content = `---
sheska: true
title: Retry Amplification
aliases:
  - Nested Retries
custom:
  status: draft
---
# Retry body`;

    const result = await useCase.execute({ externalSourceId, content });

    expect(result.fingerprint).toBe(sha256Hex('# Retry body'));
    const source = await sources.get({ id: result.sourceId });
    expect(sourceContentOf(source)).toEqual({
      body: '# Retry body',
      fingerprint: sha256Hex('# Retry body'),
      frontmatter: {
        sheska: true,
        title: 'Retry Amplification',
        aliases: ['Nested Retries'],
        custom: { status: 'draft' },
      },
      title: 'Retry Amplification',
      size: sourceContentByteSize(content),
    });

    const messages = await database.select().from(outboxMessages).where(eq(outboxMessages.eventType, 'source.sync_job.created'));
    const message = messages.find((candidate) => (candidate.payload as { syncJobId?: string }).syncJobId === result.syncJobId);
    expect(message?.payload).toMatchObject({ content: '# Retry body' });
  });

  // nocap: library-sync-7
  // nocap: library-sync-8
  it('같은 content를 다시 업로드할 때 임베딩이 최신이면 저장 갱신과 sync job 생성을 건너뛴다', async () => {
    const externalSourceId = 'Notes/upload-usecase-unchanged-with-embedding.md';
    const content = optedIntoSync('# Same source note with embedding');
    const fingerprint = sha256Hex('# Same source note with embedding');
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
    await syncJobs.update(firstSyncJob!);

    const secondResult = await useCase.execute({ externalSourceId, content });

    expect(secondResult).toEqual({
      sourceId: firstResult.sourceId,
      externalSourceId,
      fingerprint,
    });

    const persistedSyncJobs = await findSyncJobsBySourceId(firstResult.sourceId);

    expect(persistedSyncJobs).toHaveLength(1);
  });

  // nocap: library-source-2
  // nocap: library-sync-5
  // nocap: library-sync-7
  it('다른 content를 다시 업로드하면 source를 갱신하고 sync job을 추가한다', async () => {
    const externalSourceId = 'Notes/upload-usecase-changed-source.md';
    const oldContent = optedIntoSync('# Old source note');
    const newContent = optedIntoSync('# New source note');
    const oldFingerprint = sha256Hex('# Old source note');
    const newFingerprint = sha256Hex('# New source note');
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
    expect(sourceContentOf(source!)).toEqual({
      body: '# New source note',
      fingerprint: sha256Hex('# New source note'),
      frontmatter: { sheska: true },
      title: externalSourceId,
      size: sourceContentByteSize(newContent),
    });

    const persistedSyncJobs = await findSyncJobsBySourceId(firstResult.sourceId);

    expect(persistedSyncJobs).toHaveLength(2);
    expect(persistedSyncJobs.map((syncJob) => syncJob.fingerprint)).toEqual(expect.arrayContaining([oldFingerprint, newFingerprint]));
  });

  // nocap: library-sync-5
  // nocap: library-sync-6
  it('본문은 그대로이고 frontmatter만 바뀌면 source만 갱신하고 sync job은 만들지 않는다', async () => {
    const externalSourceId = 'Notes/upload-usecase-frontmatter-only.md';
    const oldContent = '---\nsheska: true\ntags: [a]\n---\n# Same body';
    const newContent = '---\nsheska: true\ntitle: Renamed\ntags: [a, b]\n---\n# Same body';
    const firstResult = await useCase.execute({
      externalSourceId,
      content: oldContent,
    });
    const firstSyncJob = await syncJobs.findLatest({
      sourceId: firstResult.sourceId,
    });
    firstSyncJob!.markCompleted(1);
    await syncJobs.update(firstSyncJob!);

    const secondResult = await useCase.execute({
      externalSourceId,
      content: newContent,
    });

    expect(secondResult).toEqual({
      sourceId: firstResult.sourceId,
      externalSourceId,
      fingerprint: sha256Hex('# Same body'),
    });
    const source = await sources.find({ externalSourceId });
    expect(sourceContentOf(source!)).toEqual({
      body: '# Same body',
      fingerprint: sha256Hex('# Same body'),
      frontmatter: { sheska: true, title: 'Renamed', tags: ['a', 'b'] },
      title: 'Renamed',
      size: sourceContentByteSize(newContent),
    });
    expect(await findSyncJobsBySourceId(firstResult.sourceId)).toHaveLength(1);
  });

  // nocap: library-sync-5
  it('frontmatter 키 순서만 다른 같은 파일은 다시 저장하지 않는다', async () => {
    const externalSourceId = 'Notes/upload-usecase-frontmatter-key-order.md';
    const content = '---\nsheska: true\nzeta: 1\nalpha: { b: 1, a: 2 }\n---\n# Body';
    const firstResult = await useCase.execute({ externalSourceId, content });
    const firstSyncJob = await syncJobs.findLatest({
      sourceId: firstResult.sourceId,
    });
    firstSyncJob!.markCompleted(1);
    await syncJobs.update(firstSyncJob!);
    const [beforeRow] = await findSourceRow(externalSourceId);

    await useCase.execute({ externalSourceId, content });

    const [afterRow] = await findSourceRow(externalSourceId);
    expect(afterRow?.updatedAt).toEqual(beforeRow?.updatedAt);
  });

  // nocap: library-source-6
  it('frontmatter sheska가 true가 아닌 파일은 거부하고 source를 만들지 않는다', async () => {
    const externalSourceId = 'Notes/upload-usecase-not-sync-target.md';
    const content = '---\nsheska: "true"\n---\n# Not opted in';

    await expect(useCase.execute({ externalSourceId, content })).rejects.toMatchObject({ code: 'source.not_sync_target' });

    expect(await sources.find({ externalSourceId })).toBeNull();
  });

  function optedIntoSync(body: string) {
    return `---\nsheska: true\n---\n${body}`;
  }

  async function findSourceRow(externalSourceId: string) {
    return database.select().from(schema.sources).where(eq(schema.sources.externalSourceId, externalSourceId));
  }

  async function findSyncJobsBySourceId(sourceId: string) {
    return database.select().from(schema.sourceSyncJobs).where(eq(schema.sourceSyncJobs.sourceId, sourceId));
  }
});
