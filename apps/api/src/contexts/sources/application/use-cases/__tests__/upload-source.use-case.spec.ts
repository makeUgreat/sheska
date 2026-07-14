import {
  Source,
  SourceSyncJob,
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/sources/domain';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import {
  type UploadSourceContentSnapshotCalculator,
  UploadSourceUseCase,
} from '../upload-source.use-case';
import { sourceContentByteSize } from '../../../../../../test/domains/fixtures/source.fixture';
import type { SourceEmbeddingLookup } from '@contexts/sources/application/ports';

type ContentSnapshotCalculatorMock = {
  calculate: MockedFunction<UploadSourceContentSnapshotCalculator['calculate']>;
};

type SourceRepositoryMock = {
  find: MockedFunction<SourceRepository['find']>;
  get: MockedFunction<SourceRepository['get']>;
  list: MockedFunction<SourceRepository['list']>;
  save: MockedFunction<SourceRepository['save']>;
};

type SourceSyncJobRepositoryMock = {
  find: MockedFunction<SourceSyncJobRepository['find']>;
  findLatestBySourceId: MockedFunction<
    SourceSyncJobRepository['findLatestBySourceId']
  >;
  save: MockedFunction<SourceSyncJobRepository['save']>;
};

type EventEmitterMock = {
  emit: MockedFunction<EventEmitter2['emit']>;
  emitAsync: MockedFunction<EventEmitter2['emitAsync']>;
};

type SourceEmbeddingLookupMock = {
  findBySourceId: MockedFunction<SourceEmbeddingLookup['findBySourceId']>;
};

function buildMockLogger() {
  return { log: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
}

describe('UploadSourceUseCase', () => {
  it('새 source를 저장하고 sync job을 생성한다', async () => {
    const contentSnapshotCalculator = createContentSnapshotCalculatorMock({
      content: '# Source note',
      fingerprint: 'fingerprint-1',
    });
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    const eventEmitter = createEventEmitterMock();
    const useCase = new UploadSourceUseCase(
      contentSnapshotCalculator,
      sources,
      syncJobs,
      asEventEmitter(eventEmitter),
      buildMockLogger(),
      createEmbeddingLookupMock(),
    );

    const result = await useCase.execute({
      externalSourceId: ' Notes/source.md ',
      content: '# Source note',
    });

    expect(result).toMatchObject({
      externalSourceId: 'Notes/source.md',
      fingerprint: 'fingerprint-1',
    });
    expect(result.sourceId.length).toBeGreaterThan(0);
    expect(result.syncJobId?.length).toBeGreaterThan(0);
    expect(contentSnapshotCalculator.calculate).toHaveBeenCalledWith(
      '# Source note',
    );
    expect(sources.find).toHaveBeenCalledWith({
      externalSourceId: 'Notes/source.md',
    });
    expectSourceSavedWith(sources, {
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
      fingerprint: 'fingerprint-1',
    });
    expectSyncJobSavedWith(syncJobs, eventEmitter, {
      sourceId: sources.save.mock.calls[0]?.[0]?.id,
      content: '# Source note',
      fingerprint: 'fingerprint-1',
    });
  });

  it('같은 content snapshot이고 임베딩이 있으면 저장과 sync job 생성을 건너뛴다', async () => {
    const existingSource = restoreSource({
      id: 'source-1',
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
      fingerprint: 'fingerprint-1',
    });
    const contentSnapshotCalculator = createContentSnapshotCalculatorMock({
      content: '# Source note',
      fingerprint: 'fingerprint-1',
    });
    const sources = createSourceRepositoryMock();
    sources.find.mockResolvedValue(existingSource);
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(
      contentSnapshotCalculator,
      sources,
      syncJobs,
      asEventEmitter(createEventEmitterMock()),
      buildMockLogger(),
      createEmbeddingLookupMock({ hasEmbedding: true }),
    );

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    expect(result).toEqual({
      sourceId: 'source-1',
      externalSourceId: 'Notes/source.md',
      fingerprint: 'fingerprint-1',
    });
    expect(sources.save).not.toHaveBeenCalled();
    expect(syncJobs.save).not.toHaveBeenCalled();
  });

  it('같은 content snapshot이라도 임베딩이 없으면 sync job을 생성한다', async () => {
    const existingSource = restoreSource({
      id: 'source-1',
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
      fingerprint: 'fingerprint-1',
    });
    const contentSnapshotCalculator = createContentSnapshotCalculatorMock({
      content: '# Source note',
      fingerprint: 'fingerprint-1',
    });
    const sources = createSourceRepositoryMock();
    sources.find.mockResolvedValue(existingSource);
    const syncJobs = createSourceSyncJobRepositoryMock();
    const eventEmitter = createEventEmitterMock();
    const useCase = new UploadSourceUseCase(
      contentSnapshotCalculator,
      sources,
      syncJobs,
      asEventEmitter(eventEmitter),
      buildMockLogger(),
      createEmbeddingLookupMock({ hasEmbedding: false }),
    );

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    expect(result.syncJobId?.length).toBeGreaterThan(0);
    expectSyncJobSavedWith(syncJobs, eventEmitter, {
      sourceId: 'source-1',
      content: '# Source note',
      fingerprint: 'fingerprint-1',
    });
  });

  it('다른 content snapshot이면 source를 갱신하고 sync job을 생성한다', async () => {
    const existingSource = restoreSource({
      id: 'source-1',
      externalSourceId: 'Notes/source.md',
      content: '# Old source note',
      fingerprint: 'fingerprint-old',
    });
    const contentSnapshotCalculator = createContentSnapshotCalculatorMock({
      content: '# New source note',
      fingerprint: 'fingerprint-new',
    });
    const sources = createSourceRepositoryMock();
    sources.find.mockResolvedValue(existingSource);
    const syncJobs = createSourceSyncJobRepositoryMock();
    const eventEmitter = createEventEmitterMock();
    const useCase = new UploadSourceUseCase(
      contentSnapshotCalculator,
      sources,
      syncJobs,
      asEventEmitter(eventEmitter),
      buildMockLogger(),
      createEmbeddingLookupMock(),
    );

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# New source note',
    });

    expect(result).toMatchObject({
      sourceId: 'source-1',
      externalSourceId: 'Notes/source.md',
      fingerprint: 'fingerprint-new',
    });
    expect(result.syncJobId?.length).toBeGreaterThan(0);
    expectSourceSavedWith(sources, {
      externalSourceId: 'Notes/source.md',
      content: '# New source note',
      fingerprint: 'fingerprint-new',
    });
    expectSyncJobSavedWith(syncJobs, eventEmitter, {
      sourceId: 'source-1',
      content: '# New source note',
      fingerprint: 'fingerprint-new',
    });
  });

  it('externalSourceId가 유효하지 않으면 collaborator를 호출하지 않고 throw한다', async () => {
    const contentSnapshotCalculator = createContentSnapshotCalculatorMock();
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(
      contentSnapshotCalculator,
      sources,
      syncJobs,
      asEventEmitter(createEventEmitterMock()),
      buildMockLogger(),
      createEmbeddingLookupMock(),
    );

    await expect(
      useCase.execute({
        externalSourceId: ' ',
        content: '# Source note',
      }),
    ).rejects.toThrow('External source id cannot be empty');
    expect(contentSnapshotCalculator.calculate).not.toHaveBeenCalled();
    expect(sources.find).not.toHaveBeenCalled();
    expect(sources.save).not.toHaveBeenCalled();
    expect(syncJobs.save).not.toHaveBeenCalled();
  });

  it('content snapshot 계산 exception을 전파한다', async () => {
    const calculationFailure = new Error('Source fingerprinter is unavailable');
    const contentSnapshotCalculator = createContentSnapshotCalculatorMock();
    contentSnapshotCalculator.calculate.mockRejectedValue(calculationFailure);
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(
      contentSnapshotCalculator,
      sources,
      syncJobs,
      asEventEmitter(createEventEmitterMock()),
      buildMockLogger(),
      createEmbeddingLookupMock(),
    );

    const result = useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    await expect(result).rejects.toBe(calculationFailure);
    expect(sources.find).not.toHaveBeenCalled();
    expect(sources.save).not.toHaveBeenCalled();
    expect(syncJobs.save).not.toHaveBeenCalled();
  });

  it('source 조회 exception을 전파한다', async () => {
    const findFailure = new Error('Source Repository operation failed');
    const contentSnapshotCalculator = createContentSnapshotCalculatorMock();
    const sources = createSourceRepositoryMock();
    sources.find.mockRejectedValue(findFailure);
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(
      contentSnapshotCalculator,
      sources,
      syncJobs,
      asEventEmitter(createEventEmitterMock()),
      buildMockLogger(),
      createEmbeddingLookupMock(),
    );

    const result = useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    await expect(result).rejects.toThrow('Source Repository operation failed');
    expect(sources.save).not.toHaveBeenCalled();
    expect(syncJobs.save).not.toHaveBeenCalled();
  });

  it('source 저장 exception을 전파하고 sync job은 저장하지 않는다', async () => {
    const saveFailure = new Error('Source Repository operation failed');
    const contentSnapshotCalculator = createContentSnapshotCalculatorMock();
    const sources = createSourceRepositoryMock();
    sources.save.mockRejectedValue(saveFailure);
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(
      contentSnapshotCalculator,
      sources,
      syncJobs,
      asEventEmitter(createEventEmitterMock()),
      buildMockLogger(),
      createEmbeddingLookupMock(),
    );

    const result = useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    await expect(result).rejects.toThrow('Source Repository operation failed');
    expect(syncJobs.save).not.toHaveBeenCalled();
  });

  it('sync job 저장 exception을 전파한다', async () => {
    const syncJobSaveFailure = new Error(
      'Source Sync Job Repository operation failed',
    );
    const contentSnapshotCalculator = createContentSnapshotCalculatorMock();
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    syncJobs.save.mockRejectedValue(syncJobSaveFailure);
    const useCase = new UploadSourceUseCase(
      contentSnapshotCalculator,
      sources,
      syncJobs,
      asEventEmitter(createEventEmitterMock()),
      buildMockLogger(),
      createEmbeddingLookupMock(),
    );

    const result = useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    await expect(result).rejects.toThrow(
      'Source Sync Job Repository operation failed',
    );
    expect(sources.save).toHaveBeenCalledOnce();
  });

  it('domain이 source snapshot을 거부하면 저장하지 않고 throw한다', async () => {
    const contentSnapshotCalculator = createContentSnapshotCalculatorMock({
      content: '# Source note',
      fingerprint: ' ',
    });
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(
      contentSnapshotCalculator,
      sources,
      syncJobs,
      asEventEmitter(createEventEmitterMock()),
      buildMockLogger(),
      createEmbeddingLookupMock(),
    );

    const result = useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    await expect(result).rejects.toThrow('Source fingerprint cannot be empty');
    expect(sources.save).not.toHaveBeenCalled();
    expect(syncJobs.save).not.toHaveBeenCalled();
  });
});

function createContentSnapshotCalculatorMock(
  snapshot = {
    content: '# Source note',
    fingerprint: 'fingerprint-1',
  },
): ContentSnapshotCalculatorMock {
  return {
    calculate: vi
      .fn<UploadSourceContentSnapshotCalculator['calculate']>()
      .mockResolvedValue(snapshot),
  };
}

function createSourceRepositoryMock(): SourceRepositoryMock {
  return {
    find: vi.fn<SourceRepository['find']>().mockResolvedValue(null),
    get: vi.fn<SourceRepository['get']>().mockResolvedValue(null),
    list: vi.fn<SourceRepository['list']>().mockResolvedValue([]),
    save: vi
      .fn<SourceRepository['save']>()
      .mockImplementation((source) => Promise.resolve(source)),
  };
}

function createSourceSyncJobRepositoryMock(): SourceSyncJobRepositoryMock {
  return {
    find: vi.fn<SourceSyncJobRepository['find']>().mockResolvedValue(null),
    findLatestBySourceId: vi
      .fn<SourceSyncJobRepository['findLatestBySourceId']>()
      .mockResolvedValue(null),
    save: vi
      .fn<SourceSyncJobRepository['save']>()
      .mockImplementation((syncJob) => Promise.resolve(syncJob)),
  };
}

function createEventEmitterMock(): EventEmitterMock {
  return {
    emit: vi.fn(),
    emitAsync: vi.fn().mockResolvedValue([]),
  };
}

const STUB_EMBEDDING_INFO = {
  model: 'qwen3-embedding:0.6b',
  dimensions: 1024,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

function createEmbeddingLookupMock(
  { hasEmbedding } = { hasEmbedding: false },
): SourceEmbeddingLookupMock {
  return {
    findBySourceId: vi
      .fn<SourceEmbeddingLookup['findBySourceId']>()
      .mockResolvedValue(hasEmbedding ? STUB_EMBEDDING_INFO : null),
  };
}

function asEventEmitter(eventEmitter: EventEmitterMock): EventEmitter2 {
  return eventEmitter as unknown as EventEmitter2;
}

function expectSourceSavedWith(
  sources: ReturnType<typeof createSourceRepositoryMock>,
  expected: {
    externalSourceId: string;
    content: string;
    fingerprint: string;
  },
) {
  expect(sources.save).toHaveBeenCalledOnce();
  const savedSource = sources.save.mock.calls[0]?.[0];
  expect(savedSource?.getProps().externalSourceId.unpack()).toBe(
    expected.externalSourceId,
  );
  expect(savedSource?.getProps().contentSnapshot.unpack()).toEqual({
    content: expected.content,
    fingerprint: expected.fingerprint,
    size: sourceContentByteSize(expected.content),
  });
}

function expectSyncJobSavedWith(
  syncJobs: ReturnType<typeof createSourceSyncJobRepositoryMock>,
  eventEmitter: EventEmitterMock,
  expected: {
    sourceId: string | undefined;
    content: string;
    fingerprint: string;
  },
) {
  expect(syncJobs.save).toHaveBeenCalledOnce();
  const savedSyncJob = syncJobs.save.mock.calls[0]?.[0];
  expect(sourceSyncJobProps(savedSyncJob)).toMatchObject({
    sourceId: expected.sourceId,
    fingerprint: expected.fingerprint,
    status: 'pending',
  });
  expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
    'source.sync_job.created',
    expect.objectContaining({
      eventName: 'source.sync_job.created',
      sourceId: expected.sourceId,
      content: expected.content,
      fingerprint: expected.fingerprint,
    }),
  );
}

function sourceSyncJobProps(syncJob: SourceSyncJob | undefined) {
  const props = syncJob?.getProps();

  return {
    sourceId: props?.sourceId,
    fingerprint: props?.fingerprint.unpack(),
    status: props?.status,
  };
}

function restoreSource(params: {
  id: string;
  externalSourceId: string;
  content: string;
  fingerprint: string;
}) {
  return Source.restore({
    ...params,
    size: sourceContentByteSize(params.content),
  });
}
