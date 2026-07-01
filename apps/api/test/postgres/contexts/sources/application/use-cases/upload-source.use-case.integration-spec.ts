import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import { type SourceFingerprinter } from '@contexts/sources/application/ports';
import { type SourceRepository } from '@contexts/sources/domain';
import { UploadSourceUseCase } from '@contexts/sources/application/use-cases/upload-source.use-case';
import * as schema from '@contexts/sources/infrastructure/persistence/postgres-drizzle/schema';
import {
  SOURCE_FINGERPRINTER,
  SOURCE_REPOSITORY,
} from '@contexts/sources/sources.di-tokens';
import { AppModule } from '@platform/nest/app.module';
import { sourceContentByteSize } from '../../../../../contexts/sources/fixtures/source.fixture';

describe('UploadSourceUseCase', () => {
  let app: INestApplication;
  let database: NodePgDatabase<typeof schema>;
  let sources: SourceRepository;
  let useCase: UploadSourceUseCase;
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
    database = app.get<NodePgDatabase<typeof schema>>(
      DATABASE_TOKENS.drizzleDatabase,
    );
    sources = app.get<SourceRepository>(SOURCE_REPOSITORY);
    useCase = app.get(UploadSourceUseCase);
  });

  beforeEach(() => {
    fingerprints.clear();
  });

  afterAll(async () => {
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
      content,
      fingerprint,
      size: sourceContentByteSize(content),
    });

    const [syncJob] = await findSyncJobsBySourceId(result.sourceId);

    expect(syncJob).toMatchObject({
      id: result.syncJobId,
      sourceId: result.sourceId,
      fingerprint,
      status: 'pending',
    });
  });

  it('같은 content를 다시 업로드하면 저장 갱신과 sync job 생성을 건너뛴다', async () => {
    const externalSourceId = 'Notes/upload-usecase-unchanged-source.md';
    const content = '# Same source note';
    const fingerprint = useFingerprint(content, 'fingerprint-unchanged-source');
    const firstResult = await useCase.execute({ externalSourceId, content });

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
      content: newContent,
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
