import { errAsync, okAsync } from '@core/result';
import { APPLICATION_ERROR_KIND } from '@kernels/application';
import {
  type SourceFingerprinterError,
  type SourceRepository,
  type SourceRepositoryError,
  type SourceSyncJobRepository,
  type SourceSyncJobRepositoryError,
} from '@contexts/sources/application/ports';
import { Source, type SourceSyncJob } from '@contexts/sources/domain';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import {
  type UploadSourceContentSnapshotCalculator,
  UploadSourceUseCase,
} from '../upload-source.use-case';
import { sourceContentByteSize } from '../../../../../../test/contexts/sources/fixtures/source.fixture';

type ContentSnapshotCalculatorMock = {
  calculate: MockedFunction<UploadSourceContentSnapshotCalculator['calculate']>;
};

type SourceRepositoryMock = {
  find: MockedFunction<SourceRepository['find']>;
  save: MockedFunction<SourceRepository['save']>;
};

type SourceSyncJobRepositoryMock = {
  save: MockedFunction<SourceSyncJobRepository['save']>;
};

describe('UploadSourceUseCase', () => {
  it('새 source를 저장하고 sync job을 생성한다', async () => {
    const contentSnapshotCalculator = createContentSnapshotCalculatorMock({
      content: '# Source note',
      fingerprint: 'fingerprint-1',
    });
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(
      contentSnapshotCalculator,
      sources,
      syncJobs,
    );

    const result = await useCase.execute({
      externalSourceId: ' Notes/source.md ',
      content: '# Source note',
    });

    expect(result.isOk()).toBe(true);

    if (result.isOk()) {
      expect(result.value).toMatchObject({
        externalSourceId: 'Notes/source.md',
        fingerprint: 'fingerprint-1',
      });
      expect(result.value.sourceId.length).toBeGreaterThan(0);
      expect(result.value.syncJobId?.length).toBeGreaterThan(0);
    }
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
    expectSyncJobSavedWith(syncJobs, {
      sourceId: sources.save.mock.calls[0]?.[0]?.id,
      fingerprint: 'fingerprint-1',
    });
  });

  it('같은 content snapshot이면 저장과 sync job 생성을 건너뛴다', async () => {
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
    sources.find.mockReturnValue(okAsync(existingSource));
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(
      contentSnapshotCalculator,
      sources,
      syncJobs,
    );

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    expect(result.isOk()).toBe(true);

    if (result.isOk()) {
      expect(result.value).toEqual({
        sourceId: 'source-1',
        externalSourceId: 'Notes/source.md',
        fingerprint: 'fingerprint-1',
      });
    }
    expect(sources.save).not.toHaveBeenCalled();
    expect(syncJobs.save).not.toHaveBeenCalled();
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
    sources.find.mockReturnValue(okAsync(existingSource));
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(
      contentSnapshotCalculator,
      sources,
      syncJobs,
    );

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# New source note',
    });

    expect(result.isOk()).toBe(true);

    if (result.isOk()) {
      expect(result.value).toMatchObject({
        sourceId: 'source-1',
        externalSourceId: 'Notes/source.md',
        fingerprint: 'fingerprint-new',
      });
      expect(result.value.syncJobId?.length).toBeGreaterThan(0);
    }
    expectSourceSavedWith(sources, {
      externalSourceId: 'Notes/source.md',
      content: '# New source note',
      fingerprint: 'fingerprint-new',
    });
    expectSyncJobSavedWith(syncJobs, {
      sourceId: 'source-1',
      fingerprint: 'fingerprint-new',
    });
  });

  it('externalSourceId가 유효하지 않으면 collaborator를 호출하지 않고 실패한다', async () => {
    const contentSnapshotCalculator = createContentSnapshotCalculatorMock();
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(
      contentSnapshotCalculator,
      sources,
      syncJobs,
    );

    const result = await useCase.execute({
      externalSourceId: ' ',
      content: '# Source note',
    });

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error.code).toBe('external_source.id_empty');
    }
    expect(contentSnapshotCalculator.calculate).not.toHaveBeenCalled();
    expect(sources.find).not.toHaveBeenCalled();
    expect(sources.save).not.toHaveBeenCalled();
    expect(syncJobs.save).not.toHaveBeenCalled();
  });

  it('content snapshot 계산 실패를 그대로 반환한다', async () => {
    const calculationError = sourceFingerprinterUnavailableError();
    const contentSnapshotCalculator = createContentSnapshotCalculatorMock();
    contentSnapshotCalculator.calculate.mockReturnValue(
      errAsync(calculationError),
    );
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(
      contentSnapshotCalculator,
      sources,
      syncJobs,
    );

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error).toBe(calculationError);
    }
    expect(sources.find).not.toHaveBeenCalled();
    expect(sources.save).not.toHaveBeenCalled();
    expect(syncJobs.save).not.toHaveBeenCalled();
  });

  it('source 조회 실패를 그대로 반환한다', async () => {
    const findError = sourceRepositoryUnavailableError();
    const contentSnapshotCalculator = createContentSnapshotCalculatorMock();
    const sources = createSourceRepositoryMock();
    sources.find.mockReturnValue(errAsync(findError));
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(
      contentSnapshotCalculator,
      sources,
      syncJobs,
    );

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error).toBe(findError);
    }
    expect(sources.save).not.toHaveBeenCalled();
    expect(syncJobs.save).not.toHaveBeenCalled();
  });

  it('source 저장 실패를 반환하고 sync job은 저장하지 않는다', async () => {
    const saveError = sourceRepositoryUnavailableError();
    const contentSnapshotCalculator = createContentSnapshotCalculatorMock();
    const sources = createSourceRepositoryMock();
    sources.save.mockReturnValue(errAsync(saveError));
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(
      contentSnapshotCalculator,
      sources,
      syncJobs,
    );

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error).toBe(saveError);
    }
    expect(syncJobs.save).not.toHaveBeenCalled();
  });

  it('sync job 저장 실패를 그대로 반환한다', async () => {
    const syncJobSaveError = sourceSyncJobRepositoryUnavailableError();
    const contentSnapshotCalculator = createContentSnapshotCalculatorMock();
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    syncJobs.save.mockReturnValue(errAsync(syncJobSaveError));
    const useCase = new UploadSourceUseCase(
      contentSnapshotCalculator,
      sources,
      syncJobs,
    );

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error).toBe(syncJobSaveError);
    }
    expect(sources.save).toHaveBeenCalledOnce();
  });

  it('domain이 source snapshot을 거부하면 저장하지 않고 실패한다', async () => {
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
    );

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error.code).toBe('source.fingerprint_empty');
    }
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
      .mockReturnValue(okAsync(snapshot)),
  };
}

function createSourceRepositoryMock(): SourceRepositoryMock {
  return {
    find: vi.fn<SourceRepository['find']>().mockReturnValue(okAsync(null)),
    save: vi
      .fn<SourceRepository['save']>()
      .mockImplementation((source) => okAsync(source)),
  };
}

function createSourceSyncJobRepositoryMock(): SourceSyncJobRepositoryMock {
  return {
    save: vi
      .fn<SourceSyncJobRepository['save']>()
      .mockImplementation((syncJob) => okAsync(syncJob)),
  };
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
  expect(savedSource?.getProps().externalSourceId.value).toBe(
    expected.externalSourceId,
  );
  expect(savedSource?.getProps().contentSnapshot.value).toEqual({
    content: expected.content,
    fingerprint: expected.fingerprint,
    size: sourceContentByteSize(expected.content),
  });
}

function expectSyncJobSavedWith(
  syncJobs: ReturnType<typeof createSourceSyncJobRepositoryMock>,
  expected: {
    sourceId: string | undefined;
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
}

function sourceSyncJobProps(syncJob: SourceSyncJob | undefined) {
  const props = syncJob?.getProps();

  return {
    sourceId: props?.sourceId,
    fingerprint: props?.fingerprint.value,
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
  })._unsafeUnwrap();
}

function sourceFingerprinterUnavailableError(): SourceFingerprinterError {
  return {
    kind: APPLICATION_ERROR_KIND.DEPENDENCY_UNAVAILABLE,
    code: 'source_fingerprinter.unavailable',
    message: 'Source fingerprinter is unavailable',
    details: {},
  };
}

function sourceRepositoryUnavailableError(): SourceRepositoryError {
  return {
    kind: APPLICATION_ERROR_KIND.DEPENDENCY_UNAVAILABLE,
    code: 'source_repository.unavailable',
    message: 'Source Repository is unavailable',
    details: { causeCode: 'source_postgres_persistence.unavailable' },
  };
}

function sourceSyncJobRepositoryUnavailableError(): SourceSyncJobRepositoryError {
  return {
    kind: APPLICATION_ERROR_KIND.DEPENDENCY_UNAVAILABLE,
    code: 'source_sync_job_repository.unavailable',
    message: 'Source Sync Job Repository is unavailable',
    details: { causeCode: 'source_postgres_persistence.unavailable' },
  };
}
