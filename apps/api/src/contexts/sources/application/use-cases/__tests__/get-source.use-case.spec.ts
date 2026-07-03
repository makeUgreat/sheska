import { type SourceRepository } from '@contexts/sources/domain';
import { APPLICATION_ERROR_KIND } from '@kernels/application';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { GetSourceUseCase } from '../get-source.use-case';
import { buildSource } from '../../../../../../test/contexts/sources/fixtures/source.fixture';

type SourceRepositoryMock = {
  get: MockedFunction<SourceRepository['get']>;
};

describe('GetSourceUseCase', () => {
  it('source를 id로 조회하여 반환한다', async () => {
    const source = buildSource({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
      fingerprint: 'fingerprint-1',
    });
    const sources = createSourceRepositoryMock();
    sources.get.mockResolvedValue(source);
    const useCase = new GetSourceUseCase(
      sources as unknown as SourceRepository,
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

  it('source가 없으면 NOT_FOUND exception을 throw한다', async () => {
    const sources = createSourceRepositoryMock();
    sources.get.mockResolvedValue(null);
    const useCase = new GetSourceUseCase(
      sources as unknown as SourceRepository,
    );

    await expect(
      useCase.execute({ sourceId: 'non-existent' }),
    ).rejects.toMatchObject({
      error: {
        kind: APPLICATION_ERROR_KIND.NOT_FOUND,
        code: 'sources.source_not_found',
      },
    });
  });

  it('repository get exception을 전파한다', async () => {
    const getFailure = new Error('Source Repository operation failed');
    const sources = createSourceRepositoryMock();
    sources.get.mockRejectedValue(getFailure);
    const useCase = new GetSourceUseCase(
      sources as unknown as SourceRepository,
    );

    await expect(useCase.execute({ sourceId: 'source-1' })).rejects.toBe(
      getFailure,
    );
  });
});

function createSourceRepositoryMock(): SourceRepositoryMock {
  return {
    get: vi.fn<SourceRepository['get']>().mockResolvedValue(null),
  };
}
