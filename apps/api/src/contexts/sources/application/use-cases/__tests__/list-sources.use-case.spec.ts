import {
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/sources/domain';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { ListSourcesUseCase } from '../list-sources.use-case';
import { buildSource } from '../../../../../../test/support/domains/fixtures/source.fixture';

type SourceRepositoryMock = {
  list: MockedFunction<SourceRepository['list']>;
};

type SourceSyncJobRepositoryMock = {
  findLatestBySourceId: MockedFunction<
    SourceSyncJobRepository['findLatestBySourceId']
  >;
};

describe('ListSourcesUseCase', () => {
  it('source가 없으면 빈 배열을 반환한다', async () => {
    const sources = createSourceRepositoryMock();
    const syncJobs = createSyncJobRepositoryMock();
    sources.list.mockResolvedValue([]);
    const useCase = new ListSourcesUseCase(
      sources as unknown as SourceRepository,
      syncJobs as unknown as SourceSyncJobRepository,
    );

    const result = await useCase.execute();

    expect(result.sources).toEqual([]);
    expect(sources.list).toHaveBeenCalledOnce();
  });

  it('source 목록을 반환한다', async () => {
    const source1 = buildSource({
      externalSourceId: 'Notes/source-1.md',
      content: '# Source 1',
      fingerprint: 'fingerprint-1',
    });
    const source2 = buildSource({
      externalSourceId: 'Notes/source-2.md',
      content: '# Source 2',
      fingerprint: 'fingerprint-2',
    });
    const sources = createSourceRepositoryMock();
    const syncJobs = createSyncJobRepositoryMock();
    sources.list.mockResolvedValue([source1, source2]);
    const useCase = new ListSourcesUseCase(
      sources as unknown as SourceRepository,
      syncJobs as unknown as SourceSyncJobRepository,
    );

    const result = await useCase.execute();

    expect(result.sources).toHaveLength(2);
    expect(result.sources[0]).toMatchObject({
      sourceId: source1.id,
      externalSourceId: 'Notes/source-1.md',
      fingerprint: 'fingerprint-1',
    });
    expect(result.sources[1]).toMatchObject({
      sourceId: source2.id,
      externalSourceId: 'Notes/source-2.md',
      fingerprint: 'fingerprint-2',
    });
  });

  it('content를 포함하지 않는다', async () => {
    const source = buildSource({ content: '# Secret content' });
    const sources = createSourceRepositoryMock();
    const syncJobs = createSyncJobRepositoryMock();
    sources.list.mockResolvedValue([source]);
    const useCase = new ListSourcesUseCase(
      sources as unknown as SourceRepository,
      syncJobs as unknown as SourceSyncJobRepository,
    );

    const result = await useCase.execute();

    expect(result.sources[0]).not.toHaveProperty('content');
  });

  it('repository list exception을 전파한다', async () => {
    const listFailure = new Error('Source Repository operation failed');
    const sources = createSourceRepositoryMock();
    const syncJobs = createSyncJobRepositoryMock();
    sources.list.mockRejectedValue(listFailure);
    const useCase = new ListSourcesUseCase(
      sources as unknown as SourceRepository,
      syncJobs as unknown as SourceSyncJobRepository,
    );

    await expect(useCase.execute()).rejects.toBe(listFailure);
  });
});

function createSourceRepositoryMock(): SourceRepositoryMock {
  return {
    list: vi.fn<SourceRepository['list']>().mockResolvedValue([]),
  };
}

function createSyncJobRepositoryMock(): SourceSyncJobRepositoryMock {
  return {
    findLatestBySourceId: vi
      .fn<SourceSyncJobRepository['findLatestBySourceId']>()
      .mockResolvedValue(null),
  };
}
