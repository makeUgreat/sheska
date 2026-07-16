import {
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/sources/domain';
import { type SourceEmbeddingLookup } from '@contexts/sources/application/ports';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { GetSourceUseCase } from '../get-source.use-case';
import { buildSource } from '../../../../../../test/support/domains/fixtures/source.fixture';

type SourceRepositoryMock = {
  get: MockedFunction<SourceRepository['get']>;
};

type SourceSyncJobRepositoryMock = {
  findLatest: MockedFunction<SourceSyncJobRepository['findLatest']>;
};

type SourceEmbeddingLookupMock = {
  find: MockedFunction<SourceEmbeddingLookup['find']>;
};

describe('GetSourceUseCase', () => {
  it('source를 id로 조회하여 반환한다', async () => {
    const source = buildSource({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
      fingerprint: 'fingerprint-1',
    });
    const sources = createSourceRepositoryMock();
    const syncJobs = createSyncJobRepositoryMock();
    const embeddingLookup = createEmbeddingLookupMock();
    sources.get.mockResolvedValue(source);
    const useCase = new GetSourceUseCase(
      sources as unknown as SourceRepository,
      syncJobs as unknown as SourceSyncJobRepository,
      embeddingLookup,
    );

    const result = await useCase.execute({ sourceId: source.id });

    expect(result).toMatchObject({
      sourceId: source.id,
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
      fingerprint: 'fingerprint-1',
    });
    expect(sources.get).toHaveBeenCalledWith({ id: source.id });
  });

  it('repository get exception을 전파한다', async () => {
    const getFailure = new Error('Source Repository operation failed');
    const sources = createSourceRepositoryMock();
    const syncJobs = createSyncJobRepositoryMock();
    const embeddingLookup = createEmbeddingLookupMock();
    sources.get.mockRejectedValue(getFailure);
    const useCase = new GetSourceUseCase(
      sources as unknown as SourceRepository,
      syncJobs as unknown as SourceSyncJobRepository,
      embeddingLookup,
    );

    await expect(useCase.execute({ sourceId: 'source-1' })).rejects.toBe(
      getFailure,
    );
  });
});

function createSourceRepositoryMock(): SourceRepositoryMock {
  return {
    get: vi
      .fn<SourceRepository['get']>()
      .mockResolvedValue(buildSource({ externalSourceId: 'Notes/source.md' })),
  };
}

function createSyncJobRepositoryMock(): SourceSyncJobRepositoryMock {
  return {
    findLatest: vi
      .fn<SourceSyncJobRepository['findLatest']>()
      .mockResolvedValue(null),
  };
}

function createEmbeddingLookupMock(): SourceEmbeddingLookupMock {
  return {
    find: vi.fn<SourceEmbeddingLookup['find']>().mockResolvedValue(null),
  };
}
