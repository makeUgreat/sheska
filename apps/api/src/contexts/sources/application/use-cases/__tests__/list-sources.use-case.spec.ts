import {
  type SourceQuery,
  type SourceQueryPaginateResult,
} from '@contexts/sources/application/ports';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { ListSourcesUseCase } from '../list-sources.use-case';

type SourceQueryMock = {
  paginate: MockedFunction<SourceQuery['paginate']>;
  find: MockedFunction<SourceQuery['find']>;
};

function buildPaginateResult(
  overrides: Partial<SourceQueryPaginateResult> = {},
): SourceQueryPaginateResult {
  return {
    sources: [],
    nextCursor: null,
    ...overrides,
  };
}

describe('ListSourcesUseCase', () => {
  it('source가 없으면 빈 배열을 반환한다', async () => {
    const sourceQuery = createSourceQueryMock();
    sourceQuery.paginate.mockResolvedValue(buildPaginateResult());
    const useCase = new ListSourcesUseCase(sourceQuery);

    const result = await useCase.execute();

    expect(result.sources).toEqual([]);
    expect(sourceQuery.paginate).toHaveBeenCalledOnce();
  });

  it('source 목록을 반환한다', async () => {
    const sourceQuery = createSourceQueryMock();
    const now = new Date();
    sourceQuery.paginate.mockResolvedValue(
      buildPaginateResult({
        sources: [
          {
            sourceId: 'source-1',
            externalSourceId: 'Notes/source-1.md',
            fingerprint: 'fingerprint-1',
            sizeBytes: 100,
            createdAt: now,
            updatedAt: now,
            latestSyncJob: null,
            publishedPostId: null,
          },
          {
            sourceId: 'source-2',
            externalSourceId: 'Notes/source-2.md',
            fingerprint: 'fingerprint-2',
            sizeBytes: 200,
            createdAt: now,
            updatedAt: now,
            latestSyncJob: null,
            publishedPostId: null,
          },
        ],
      }),
    );
    const useCase = new ListSourcesUseCase(sourceQuery);

    const result = await useCase.execute();

    expect(result.sources).toHaveLength(2);
    expect(result.sources[0]).toMatchObject({
      sourceId: 'source-1',
      externalSourceId: 'Notes/source-1.md',
      fingerprint: 'fingerprint-1',
    });
    expect(result.sources[1]).toMatchObject({
      sourceId: 'source-2',
      externalSourceId: 'Notes/source-2.md',
      fingerprint: 'fingerprint-2',
    });
  });

  it('content를 포함하지 않는다', async () => {
    const sourceQuery = createSourceQueryMock();
    const now = new Date();
    sourceQuery.paginate.mockResolvedValue(
      buildPaginateResult({
        sources: [
          {
            sourceId: 'source-1',
            externalSourceId: 'Notes/source-1.md',
            fingerprint: 'fp',
            sizeBytes: 100,
            createdAt: now,
            updatedAt: now,
            latestSyncJob: null,
            publishedPostId: null,
          },
        ],
      }),
    );
    const useCase = new ListSourcesUseCase(sourceQuery);

    const result = await useCase.execute();

    expect(result.sources[0]).not.toHaveProperty('content');
  });

  it('sourceQuery paginate exception을 전파한다', async () => {
    const paginateFailure = new Error('Source Query operation failed');
    const sourceQuery = createSourceQueryMock();
    sourceQuery.paginate.mockRejectedValue(paginateFailure);
    const useCase = new ListSourcesUseCase(sourceQuery);

    await expect(useCase.execute()).rejects.toBe(paginateFailure);
  });
});

function createSourceQueryMock(): SourceQueryMock {
  return {
    paginate: vi
      .fn<SourceQuery['paginate']>()
      .mockResolvedValue(buildPaginateResult()),
    find: vi.fn<SourceQuery['find']>().mockResolvedValue(null),
  };
}
