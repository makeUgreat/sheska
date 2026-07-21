import {
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/sources/domain';
import {
  type SourceEmbeddingLookup,
  type SourceQuery,
} from '@contexts/sources/application/ports';
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

type SourceQueryMock = {
  find: MockedFunction<SourceQuery['find']>;
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
    const sourceQuery = createSourceQueryMock();
    sources.get.mockResolvedValue(source);
    const useCase = new GetSourceUseCase(
      sources as unknown as SourceRepository,
      syncJobs as unknown as SourceSyncJobRepository,
      embeddingLookup,
      sourceQuery as unknown as SourceQuery,
    );

    const result = await useCase.execute({ sourceId: source.id });

    expect(result).toMatchObject({
      sourceId: source.id,
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
      fingerprint: 'fingerprint-1',
      publishedPostId: null,
    });
    expect(sources.get).toHaveBeenCalledWith({ id: source.id });
  });

  it('publishedPostId를 sourceQuery로부터 조회하여 반환한다', async () => {
    const source = buildSource({ externalSourceId: 'Notes/source.md' });
    const sources = createSourceRepositoryMock();
    const syncJobs = createSyncJobRepositoryMock();
    const embeddingLookup = createEmbeddingLookupMock();
    const sourceQuery = createSourceQueryMock();
    sources.get.mockResolvedValue(source);
    sourceQuery.find.mockResolvedValue('post-1');
    const useCase = new GetSourceUseCase(
      sources as unknown as SourceRepository,
      syncJobs as unknown as SourceSyncJobRepository,
      embeddingLookup,
      sourceQuery as unknown as SourceQuery,
    );

    const result = await useCase.execute({ sourceId: source.id });

    expect(result.publishedPostId).toBe('post-1');
    expect(sourceQuery.find).toHaveBeenCalledWith({ sourceId: source.id });
  });

  it('repository get exception을 전파한다', async () => {
    const getFailure = new Error('Source Repository operation failed');
    const sources = createSourceRepositoryMock();
    const syncJobs = createSyncJobRepositoryMock();
    const embeddingLookup = createEmbeddingLookupMock();
    const sourceQuery = createSourceQueryMock();
    sources.get.mockRejectedValue(getFailure);
    const useCase = new GetSourceUseCase(
      sources as unknown as SourceRepository,
      syncJobs as unknown as SourceSyncJobRepository,
      embeddingLookup,
      sourceQuery as unknown as SourceQuery,
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

function createSourceQueryMock(): SourceQueryMock {
  return {
    find: vi.fn<SourceQuery['find']>().mockResolvedValue(null),
  };
}
