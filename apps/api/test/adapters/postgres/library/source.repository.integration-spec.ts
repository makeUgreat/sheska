import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { type SourceRepository } from '@contexts/library/domain';
import { SOURCE_REPOSITORY } from '@contexts/library/library.di-tokens';
import { AppModule } from '@platform/nest/app.module';
import {
  buildSource,
  sourceContentByteSize,
} from '../../../support/domains/fixtures/source.fixture';

describe('SourceDrizzleRepository', () => {
  let app: INestApplication;
  let repository: SourceRepository;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    repository = app.get<SourceRepository>(SOURCE_REPOSITORY);
  });

  afterAll(async () => {
    await app.close();
  });

  it('source를 저장하고 externalSourceId로 조회한다', async () => {
    const externalSourceId = 'Notes/find-source.md';
    const source = buildSource({ externalSourceId });

    const saveResult = await repository.insert(source);
    const findResult = await repository.find({ externalSourceId });

    expect(saveResult.id).toBe(source.id);
    expect(findResult?.id).toBe(source.id);
    expect(findResult?.getProps().contentSnapshot.unpack()).toEqual({
      body: '# Source note',
      frontmatter: {},
      title: externalSourceId,
      fingerprint: 'fingerprint-1',
      size: sourceContentByteSize('# Source note'),
    });
  });

  it('source를 갱신한다', async () => {
    const externalSourceId = 'Notes/update-source.md';
    const source = buildSource({ externalSourceId });
    await repository.insert(source);

    source.syncContentSnapshot({
      body: '# Changed source note',
      frontmatter: {},
      title: externalSourceId,
      fingerprint: 'fingerprint-2',
      size: sourceContentByteSize('# Changed source note'),
    });

    const saveResult = await repository.update(source);
    const findResult = await repository.find({ externalSourceId });

    expect(saveResult.id).toBe(source.id);
    expect(findResult?.getProps().contentSnapshot.unpack()).toEqual({
      body: '# Changed source note',
      frontmatter: {},
      title: externalSourceId,
      fingerprint: 'fingerprint-2',
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
    expect(result?.getProps().contentSnapshot.unpack()).toEqual({
      body: '# Source note',
      frontmatter: {},
      title: 'Notes/find-source-by-id.md',
      fingerprint: 'fingerprint-1',
      size: sourceContentByteSize('# Source note'),
    });
  });

  it('존재하지 않는 id는 null을 반환한다', async () => {
    const result = await repository.find({ id: 'non-existent-id' });

    expect(result).toBeNull();
  });

  it('존재하지 않는 id는 NotFoundError를 throw한다', async () => {
    await expect(
      repository.get({ id: 'non-existent-id' }),
    ).rejects.toMatchObject({
      kind: 'not_found',
      code: 'source.not_found',
    });
  });

  it('externalSourceId unique 충돌을 exception으로 전파한다', async () => {
    const externalSourceId = 'Notes/conflict-source.md';
    const firstSource = buildSource({ externalSourceId });
    const secondSource = buildSource({
      externalSourceId,
      content: '# Another source note',
      fingerprint: 'fingerprint-2',
    });

    await repository.insert(firstSource);

    await expect(repository.insert(secondSource)).rejects.toMatchObject({
      kind: 'constraint_violation',
      code: 'source.external_source_id_already_exists',
    });
  });
});
