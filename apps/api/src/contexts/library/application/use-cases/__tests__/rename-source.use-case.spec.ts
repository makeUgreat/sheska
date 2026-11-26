import { type Source, type SourceRepository } from '@contexts/library/domain';
import { describe, expect, it, vi } from 'vitest';
import { RenameSourceUseCase } from '../rename-source.use-case';
import { buildSource } from '../../../../../../test/support/domains/fixtures/source.fixture';

function buildUseCase(existing: Source[]) {
  const update = vi.fn<SourceRepository['update']>((source) => Promise.resolve(source));
  const sources: SourceRepository = {
    find: vi.fn<SourceRepository['find']>((criteria) =>
      Promise.resolve(
        'externalSourceId' in criteria
          ? (existing.find((source) => source.getProps().externalSourceId.unpack() === criteria.externalSourceId) ?? null)
          : null,
      ),
    ),
    get: vi.fn(),
    insert: vi.fn(),
    update,
    delete: vi.fn(),
  };

  return { useCase: new RenameSourceUseCase(sources), update };
}

describe('RenameSourceUseCase', () => {
  it('source를 새 경로로 옮기고 같은 식별자를 돌려준다', async () => {
    const source = buildSource({ externalSourceId: 'Notes/old.md' });
    const { useCase, update } = buildUseCase([source]);

    const result = await useCase.execute({ fromExternalSourceId: 'Notes/old.md', toExternalSourceId: 'Notes/new.md' });

    expect(result).toEqual({ sourceId: source.id });
    expect(update).toHaveBeenCalledWith(source);
    expect(source.getProps().externalSourceId.unpack()).toBe('Notes/new.md');
  });

  // nocap: library-sync-2
  it('이미 옮긴 요청을 다시 받으면 옮겨 둔 source를 돌려주고 바꾸지 않는다', async () => {
    const moved = buildSource({ externalSourceId: 'Notes/new.md' });
    const { useCase, update } = buildUseCase([moved]);

    const result = await useCase.execute({ fromExternalSourceId: 'Notes/old.md', toExternalSourceId: 'Notes/new.md' });

    expect(result).toEqual({ sourceId: moved.id });
    expect(update).not.toHaveBeenCalled();
  });

  it('두 경로 모두 source가 없으면 not_found를 던진다', async () => {
    const { useCase } = buildUseCase([]);

    await expect(useCase.execute({ fromExternalSourceId: 'Notes/old.md', toExternalSourceId: 'Notes/new.md' })).rejects.toMatchObject({
      kind: 'not_found',
      code: 'source.not_found',
    });
  });

  // nocap: library-source-2
  it('새 경로에 다른 source가 있으면 옮기지 않고 거부한다', async () => {
    const source = buildSource({ externalSourceId: 'Notes/old.md' });
    const other = buildSource({ externalSourceId: 'Notes/new.md' });
    const { useCase, update } = buildUseCase([source, other]);

    await expect(useCase.execute({ fromExternalSourceId: 'Notes/old.md', toExternalSourceId: 'Notes/new.md' })).rejects.toMatchObject({
      kind: 'constraint_violation',
      code: 'source.rename_target_exists',
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('같은 경로로 옮기면 바꾸지 않고 그 source를 돌려준다', async () => {
    const source = buildSource({ externalSourceId: 'Notes/same.md' });
    const { useCase, update } = buildUseCase([source]);

    const result = await useCase.execute({ fromExternalSourceId: 'Notes/same.md', toExternalSourceId: ' Notes/same.md ' });

    expect(result).toEqual({ sourceId: source.id });
    expect(update).not.toHaveBeenCalled();
  });
});
