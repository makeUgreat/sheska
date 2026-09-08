import { describe, expect, it, vi } from 'vitest';
import { Source, type SourceRepository } from '@contexts/sources/domain';
import { SourceFromRepositoryLookup } from '../source.from-repository.lookup';

function buildMockRepository(
  overrides: Partial<SourceRepository> = {},
): SourceRepository {
  return {
    find: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    save: vi.fn(),
    ...overrides,
  } satisfies SourceRepository;
}

describe('SourceFromRepositoryLookup', () => {
  describe('get', () => {
    it('저장된 Source를 content/externalSourceId로 매핑해 반환한다', async () => {
      const source = Source.create({
        externalSourceId: 'external-1',
        content: '# Source note',
        fingerprint: 'fingerprint-1',
      });
      const repository = buildMockRepository({
        get: vi.fn().mockResolvedValue(source),
      });
      const service = new SourceFromRepositoryLookup(repository);

      const result = await service.get('source-1');

      expect(result).toEqual({
        content: '# Source note',
        externalSourceId: 'external-1',
      });
    });
  });

  describe('find', () => {
    it('repository가 null을 반환하면 null을 반환한다', async () => {
      const repository = buildMockRepository({
        find: vi.fn().mockResolvedValue(null),
      });
      const service = new SourceFromRepositoryLookup(repository);

      const result = await service.find('missing');

      expect(result).toBeNull();
    });
  });
});
