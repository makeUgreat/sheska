import { sha256Hex } from '@core/hash';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type TestingModule } from '@nestjs/testing';
import { type SourceRepository } from '@contexts/library/domain';
import { SourcePgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/source.pg-drizzle.repository';
import { SOURCE_REPOSITORY } from '@contexts/library/library.di-tokens';
import { buildSource, sourceContentByteSize, sourceContentOf } from '../../../support/domains/fixtures/source.fixture';
import { setupPostgresTestingModule } from '../support/setup-postgres-testing-module';

describe('SourceDrizzleRepository', () => {
  let testingModule: TestingModule;
  let repository: SourceRepository;

  beforeAll(async () => {
    testingModule = await setupPostgresTestingModule([{ provide: SOURCE_REPOSITORY, useClass: SourcePgDrizzleRepository }]);
    repository = testingModule.get<SourceRepository>(SOURCE_REPOSITORY);
  });

  afterAll(async () => {
    await testingModule.close();
  });

  it('source를 저장하고 externalSourceId로 조회한다', async () => {
    const externalSourceId = 'Notes/find-source.md';
    const source = buildSource({ externalSourceId });

    const saveResult = await repository.insert(source);
    const findResult = await repository.find({ externalSourceId });

    expect(saveResult.id).toBe(source.id);
    expect(findResult?.id).toBe(source.id);
    expect(sourceContentOf(findResult!)).toEqual({
      body: '# Source note',
      fingerprint: sha256Hex('# Source note'),
      frontmatter: { sheska: true },
      title: externalSourceId,
      size: sourceContentByteSize('# Source note'),
    });
  });

  it('source를 갱신한다', async () => {
    const externalSourceId = 'Notes/update-source.md';
    const source = buildSource({ externalSourceId });
    await repository.insert(source);

    source.syncContent({
      body: '# Changed source note',
      frontmatter: { sheska: true },
      size: sourceContentByteSize('# Changed source note'),
    });

    const saveResult = await repository.update(source);
    const findResult = await repository.find({ externalSourceId });

    expect(saveResult.id).toBe(source.id);
    expect(sourceContentOf(findResult!)).toEqual({
      body: '# Changed source note',
      fingerprint: sha256Hex('# Changed source note'),
      frontmatter: { sheska: true },
      title: externalSourceId,
      size: sourceContentByteSize('# Changed source note'),
    });
  });

  it('id로 source를 조회한다', async () => {
    const source = buildSource({
      externalSourceId: 'Notes/find-source-by-id.md',
    });
    await repository.insert(source);

    const result = await repository.find({ id: source.id });

    expect(result?.id).toBe(source.id);
    expect(sourceContentOf(result!)).toEqual({
      body: '# Source note',
      fingerprint: sha256Hex('# Source note'),
      frontmatter: { sheska: true },
      title: 'Notes/find-source-by-id.md',
      size: sourceContentByteSize('# Source note'),
    });
  });

  it('존재하지 않는 id는 null을 반환한다', async () => {
    const result = await repository.find({ id: 'non-existent-id' });

    expect(result).toBeNull();
  });

  it('존재하지 않는 id는 NotFoundError를 throw한다', async () => {
    await expect(repository.get({ id: 'non-existent-id' })).rejects.toMatchObject({
      kind: 'not_found',
      code: 'source.not_found',
    });
  });

  // nocap: library-source-2
  it('externalSourceId unique 충돌을 exception으로 전파한다', async () => {
    const externalSourceId = 'Notes/conflict-source.md';
    const firstSource = buildSource({ externalSourceId });
    const secondSource = buildSource({
      externalSourceId,
      content: '# Another source note',
    });

    await repository.insert(firstSource);

    await expect(repository.insert(secondSource)).rejects.toMatchObject({
      kind: 'constraint_violation',
      code: 'source.external_source_id_already_exists',
    });
  });
});
