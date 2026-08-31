import { describe, expect, it } from 'vitest';
import {
  InfrastructureException,
  INFRASTRUCTURE_ERROR_KIND,
} from '@kernels/infrastructure';
import { buildSourceEmbedding } from '../../../../../../../test/support/domains/fixtures/source-embedding.fixture';
import { SourceEmbeddingPgDrizzleRepository } from '../source-embedding.pg-drizzle.repository';

describe('SourceEmbeddingPgDrizzleRepository', () => {
  it('Postgres error는 CONFLICT exception으로 전파한다', async () => {
    const repository = new SourceEmbeddingPgDrizzleRepository(
      createSaveRejectingDb(createPostgresError('23505')),
    );

    const result = repository.save(buildSourceEmbedding());

    await expect(result).rejects.toBeInstanceOf(InfrastructureException);
    await expect(result).rejects.toMatchObject({
      kind: INFRASTRUCTURE_ERROR_KIND.CONFLICT,
      code: 'source_embedding.save_failed',
    });
  });

  it('unknown failure는 UNEXPECTED exception으로 전파한다', async () => {
    const repository = new SourceEmbeddingPgDrizzleRepository(
      createSaveRejectingDb(new Error('connection failed')),
    );

    const result = repository.save(buildSourceEmbedding());

    await expect(result).rejects.toBeInstanceOf(InfrastructureException);
    await expect(result).rejects.toMatchObject({
      kind: INFRASTRUCTURE_ERROR_KIND.UNEXPECTED,
      code: 'source_embedding.save_failed',
    });
  });
});

function createSaveRejectingDb(
  error: Error,
): ConstructorParameters<typeof SourceEmbeddingPgDrizzleRepository>[0] {
  return {
    transaction: (fn: (tx: unknown) => Promise<void>) =>
      fn({
        delete: () => ({ where: () => Promise.resolve() }),
        insert: () => ({ values: () => Promise.reject(error) }),
      }),
  } as unknown as ConstructorParameters<
    typeof SourceEmbeddingPgDrizzleRepository
  >[0];
}

function createPostgresError(code: string): Error {
  return Object.assign(new Error('Postgres error'), { code });
}
