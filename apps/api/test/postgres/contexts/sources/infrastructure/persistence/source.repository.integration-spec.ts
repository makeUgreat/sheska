import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { type SourceRepository } from '@contexts/sources/domain';
import { SOURCES_TOKENS } from '@contexts/sources/sources.tokens';
import { AppModule } from '@platform/nest/app.module';
import {
  buildSource,
  sourceContentByteSize,
} from '../../../../../contexts/sources/fixtures/source.fixture';

describe('SourceDrizzleRepository', () => {
  let app: INestApplication;
  let repository: SourceRepository;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    repository = app.get<SourceRepository>(SOURCES_TOKENS.sourceRepository);
  });

  afterAll(async () => {
    await app.close();
  });

  it('source를 저장하고 externalSourceId로 조회한다', async () => {
    const externalSourceId = 'Notes/find-source.md';
    const source = buildSource({ externalSourceId });

    const saveResult = await repository.save(source);
    const findResult = await repository.find({ externalSourceId });

    expect(saveResult.id).toBe(source.id);
    expect(findResult?.id).toBe(source.id);
    expect(findResult?.getProps().contentSnapshot.unpack()).toEqual({
      content: '# Source note',
      fingerprint: 'fingerprint-1',
      size: sourceContentByteSize('# Source note'),
    });
  });

  it('source를 갱신한다', async () => {
    const externalSourceId = 'Notes/update-source.md';
    const source = buildSource({ externalSourceId });
    await repository.save(source);

    source.syncContentSnapshot({
      content: '# Changed source note',
      fingerprint: 'fingerprint-2',
    });

    const saveResult = await repository.save(source);
    const findResult = await repository.find({ externalSourceId });

    expect(saveResult.id).toBe(source.id);
    expect(findResult?.getProps().contentSnapshot.unpack()).toEqual({
      content: '# Changed source note',
      fingerprint: 'fingerprint-2',
      size: sourceContentByteSize('# Changed source note'),
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

    await repository.save(firstSource);

    await expect(repository.save(secondSource)).rejects.toThrow(
      'Source Repository operation failed',
    );
  });
});
