import { errAsync, okAsync } from '@core/result';
import { APPLICATION_ERROR_KIND } from '@kernels/application';
import { Source, type SourceSyncJob } from '@contexts/sources/domain';
import {
  type SourceFingerprinter,
  type SourceFingerprinterError,
  type SourceRepository,
  type SourceRepositoryError,
  type SourceSyncJobRepository,
  type SourceSyncJobRepositoryError,
} from '@contexts/sources/application/ports';
import { describe, expect, it } from 'vitest';
import { SourceContentSnapshotCalculator } from '../../services/source-content-snapshot-calculator.service';
import { UploadSourceUseCase } from '../upload-source.use-case';

class StubSourceFingerprinter implements SourceFingerprinter {
  readonly calls: string[] = [];
  fingerprint = 'fingerprint-1';
  error: SourceFingerprinterError | null = null;

  calculate(content: string) {
    this.calls.push(content);

    if (this.error) {
      return errAsync(this.error);
    }

    return okAsync(this.fingerprint);
  }
}

class StubSourceRepository implements SourceRepository {
  existingSource: Source | null = null;
  findError: SourceRepositoryError | null = null;
  saveSourceError: SourceRepositoryError | null = null;

  readonly findExternalSourceIds: string[] = [];
  readonly savedSources: Source[] = [];

  findByExternalSourceId(externalSourceId: string) {
    this.findExternalSourceIds.push(externalSourceId);

    if (this.findError) {
      return errAsync(this.findError);
    }

    return okAsync(this.existingSource);
  }

  save(source: Source) {
    this.savedSources.push(source);

    if (this.saveSourceError) {
      return errAsync(this.saveSourceError);
    }

    return okAsync(source);
  }
}

class StubSourceSyncJobRepository implements SourceSyncJobRepository {
  saveSyncJobError: SourceSyncJobRepositoryError | null = null;

  readonly savedSyncJobs: SourceSyncJob[] = [];

  save(syncJob: SourceSyncJob) {
    this.savedSyncJobs.push(syncJob);

    if (this.saveSyncJobError) {
      return errAsync(this.saveSyncJobError);
    }

    return okAsync(syncJob);
  }
}

function createUseCase(
  params: {
    fingerprinter?: StubSourceFingerprinter;
    sources?: StubSourceRepository;
    syncJobs?: StubSourceSyncJobRepository;
  } = {},
): {
  fingerprinter: StubSourceFingerprinter;
  sources: StubSourceRepository;
  syncJobs: StubSourceSyncJobRepository;
  useCase: UploadSourceUseCase;
} {
  const fingerprinter = params.fingerprinter ?? new StubSourceFingerprinter();
  const sources = params.sources ?? new StubSourceRepository();
  const syncJobs = params.syncJobs ?? new StubSourceSyncJobRepository();
  const calculator = new SourceContentSnapshotCalculator(fingerprinter);

  return {
    fingerprinter,
    sources,
    syncJobs,
    useCase: new UploadSourceUseCase(calculator, sources, syncJobs),
  };
}

function createExistingSource(
  params: {
    externalSourceId?: string;
    content?: string;
    fingerprint?: string;
  } = {},
): Source {
  const content = params.content ?? '# Old note';
  const result = Source.restore({
    id: 'source-1',
    externalSourceId: params.externalSourceId ?? 'Notes/source.md',
    content,
    fingerprint: params.fingerprint ?? 'fingerprint-1',
    size: byteSize(content),
  });

  if (result.isErr()) {
    throw new Error(result.error.message);
  }

  return result.value;
}

function byteSize(content: string): number {
  return new TextEncoder().encode(content).length;
}

function fingerprinterUnavailableError(): SourceFingerprinterError {
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
    message: 'Source repository is unavailable',
    details: { causeCode: 'source_repository.unavailable' },
  };
}

function sourceRepositoryStateConflictError(): SourceRepositoryError {
  return {
    kind: APPLICATION_ERROR_KIND.STATE_CONFLICT,
    code: 'source_repository.state_conflict',
    message: 'Source repository state conflict',
    details: {},
  };
}

function sourceRepositoryDomainError(): SourceRepositoryError {
  return {
    kind: 'invariant_violation',
    code: 'source.size_mismatch',
    message: 'Source size must match content byte size',
    details: { fields: ['content', 'size'] },
  };
}

function sourceSyncJobRepositoryUnavailableError(): SourceSyncJobRepositoryError {
  return {
    kind: APPLICATION_ERROR_KIND.DEPENDENCY_UNAVAILABLE,
    code: 'source_sync_job_repository.unavailable',
    message: 'Source sync job repository is unavailable',
    details: { causeCode: 'source_sync_job_repository.unavailable' },
  };
}

describe('UploadSourceUseCase', () => {
  it('새 externalSourceId이면 source와 sync job을 생성한다', async () => {
    const { sources, syncJobs, useCase } = createUseCase();

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

    expect(sources.findExternalSourceIds).toEqual(['Notes/source.md']);
    expect(sources.savedSources).toHaveLength(1);
    expect(syncJobs.savedSyncJobs).toHaveLength(1);

    const savedSource = sources.savedSources[0];
    const savedSyncJob = syncJobs.savedSyncJobs[0];

    expect(savedSource?.getProps().externalSourceId.value).toBe(
      'Notes/source.md',
    );
    expect(savedSource?.getProps().contentSnapshot.value).toEqual({
      content: '# Source note',
      fingerprint: 'fingerprint-1',
      size: byteSize('# Source note'),
    });
    expect(savedSyncJob?.getProps()).toMatchObject({
      sourceId: savedSource?.id,
      status: 'pending',
    });
    expect(savedSyncJob?.getProps().fingerprint.value).toBe('fingerprint-1');
    expect(savedSource?.domainEvents).toEqual([]);
  });

  it('기존 source의 fingerprint가 다르면 source를 갱신하고 sync job을 생성한다', async () => {
    const sources = new StubSourceRepository();
    sources.existingSource = createExistingSource({
      content: '# Old note',
      fingerprint: 'fingerprint-1',
    });
    const fingerprinter = new StubSourceFingerprinter();
    fingerprinter.fingerprint = 'fingerprint-2';
    const { syncJobs, useCase } = createUseCase({ fingerprinter, sources });

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# New note',
    });

    expect(result.isOk()).toBe(true);

    if (result.isOk()) {
      expect(result.value).toMatchObject({
        sourceId: sources.existingSource.id,
        externalSourceId: 'Notes/source.md',
        fingerprint: 'fingerprint-2',
      });
      expect(result.value.syncJobId?.length).toBeGreaterThan(0);
    }

    expect(sources.savedSources).toHaveLength(1);
    expect(syncJobs.savedSyncJobs).toHaveLength(1);
    expect(sources.savedSources[0]?.getProps().contentSnapshot.value).toEqual({
      content: '# New note',
      fingerprint: 'fingerprint-2',
      size: byteSize('# New note'),
    });
    expect(syncJobs.savedSyncJobs[0]?.getProps().fingerprint.value).toBe(
      'fingerprint-2',
    );
    expect(sources.savedSources[0]?.domainEvents).toEqual([]);
  });

  it('기존 source의 fingerprint가 같으면 저장과 sync job 생성을 건너뛴다', async () => {
    const sources = new StubSourceRepository();
    sources.existingSource = createExistingSource({
      content: '# Old note',
      fingerprint: 'fingerprint-1',
    });
    const { syncJobs, useCase } = createUseCase({ sources });

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# New note',
    });

    expect(result.isOk()).toBe(true);

    if (result.isOk()) {
      expect(result.value).toEqual({
        sourceId: sources.existingSource.id,
        externalSourceId: 'Notes/source.md',
        fingerprint: 'fingerprint-1',
      });
    }

    expect(sources.savedSources).toEqual([]);
    expect(syncJobs.savedSyncJobs).toEqual([]);
    expect(
      sources.existingSource.getProps().contentSnapshot.value.content,
    ).toBe('# Old note');
  });

  it('externalSourceId가 공백뿐이면 domain error를 그대로 반환하고 의존성을 호출하지 않는다', async () => {
    const { fingerprinter, sources, useCase } = createUseCase();

    const result = await useCase.execute({
      externalSourceId: '  ',
      content: '# Source note',
    });

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error.kind).toBe('invariant_violation');
      expect(result.error.code).toBe('external_source.id_empty');
    }
    expect(fingerprinter.calls).toEqual([]);
    expect(sources.findExternalSourceIds).toEqual([]);
  });

  it('fingerprint 계산 실패를 그대로 반환한다', async () => {
    const fingerprinter = new StubSourceFingerprinter();
    const fingerprinterError = fingerprinterUnavailableError();
    fingerprinter.error = fingerprinterError;
    const { sources, useCase } = createUseCase({ fingerprinter });

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error).toBe(fingerprinterError);
    }
    expect(sources.findExternalSourceIds).toEqual([]);
  });

  it('source 조회 실패를 그대로 반환한다', async () => {
    const sources = new StubSourceRepository();
    const repositoryError = sourceRepositoryUnavailableError();
    sources.findError = repositoryError;
    const { useCase } = createUseCase({ sources });

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error).toBe(repositoryError);
    }
  });

  it('source 조회에서 domain error가 반환되면 그대로 통과시킨다', async () => {
    const sources = new StubSourceRepository();
    const domainError = sourceRepositoryDomainError();
    sources.findError = domainError;
    const { useCase } = createUseCase({ sources });

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error).toBe(domainError);
    }
  });

  it('저장 중 state conflict가 발생하면 그대로 반환한다', async () => {
    const sources = new StubSourceRepository();
    const repositoryError = sourceRepositoryStateConflictError();
    sources.saveSourceError = repositoryError;
    const { useCase } = createUseCase({ sources });

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error).toBe(repositoryError);
    }
  });

  it('sync job 저장 실패를 그대로 반환한다', async () => {
    const syncJobs = new StubSourceSyncJobRepository();
    const repositoryError = sourceSyncJobRepositoryUnavailableError();
    syncJobs.saveSyncJobError = repositoryError;
    const { useCase } = createUseCase({ syncJobs });

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error).toBe(repositoryError);
    }
  });
});
