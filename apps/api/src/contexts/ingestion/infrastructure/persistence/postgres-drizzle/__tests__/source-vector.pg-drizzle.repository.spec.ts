import { describe, expect, it } from 'vitest';
import {
  InfrastructureException,
  INFRASTRUCTURE_ERROR_KIND,
} from '@kernels/infrastructure';
import { buildSourceVector } from '../../../../../../../test/domains/fixtures/source-vector.fixture';
import { SourceVectorPgDrizzleRepository } from '../source-vector.pg-drizzle.repository';

describe('SourceVectorPgDrizzleRepository', () => {
  it('Postgres conflict는 CONFLICT exception으로 전파한다', async () => {
    const repository = new SourceVectorPgDrizzleRepository(
      createSaveRejectingDb(createPostgresError('23505')),
    );

    const result = repository.save(buildSourceVector());

    await expect(result).rejects.toBeInstanceOf(InfrastructureException);
    await expect(result).rejects.toMatchObject({
      kind: INFRASTRUCTURE_ERROR_KIND.CONFLICT,
      code: 'source_vector.save_failed',
    });
  });

  it('unknown failure는 UNEXPECTED exception으로 전파한다', async () => {
    const repository = new SourceVectorPgDrizzleRepository(
      createSaveRejectingDb(new Error('connection failed')),
    );

    const result = repository.save(buildSourceVector());

    await expect(result).rejects.toBeInstanceOf(InfrastructureException);
    await expect(result).rejects.toMatchObject({
      kind: INFRASTRUCTURE_ERROR_KIND.UNEXPECTED,
      code: 'source_vector.save_failed',
    });
  });
});

function createSaveRejectingDb(
  error: Error,
): ConstructorParameters<typeof SourceVectorPgDrizzleRepository>[0] {
  return {
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => Promise.reject(error),
      }),
    }),
  } as unknown as ConstructorParameters<
    typeof SourceVectorPgDrizzleRepository
  >[0];
}

function createPostgresError(code: string): Error {
  return Object.assign(new Error('Postgres error'), { code });
}
