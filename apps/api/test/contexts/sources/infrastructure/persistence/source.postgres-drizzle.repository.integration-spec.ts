import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { type SourceRepository } from '@contexts/sources/application/ports';
import { SOURCES_TOKENS } from '@contexts/sources/sources.tokens';
import { AppModule } from '@platform/nest/app.module';
import { createSourceFixture, byteSize } from '../../fixtures/source.fixture';
import { createTestNestApp } from '../../../../support/nest-test-app';

describe('SourceDrizzleRepository', () => {
  let app: INestApplication;
  let repository: SourceRepository;

  beforeAll(async () => {
    app = await createTestNestApp(AppModule);
    repository = app.get<SourceRepository>(SOURCES_TOKENS.sourceRepository);
  });

  afterAll(async () => {
    await app.close();
  });

  it('source를 저장하고 externalSourceId로 조회한다', async () => {
    const externalSourceId = 'Notes/find-source.md';
    const source = createSourceFixture({ externalSourceId });

    const saveResult = await repository.save(source);
    const findResult = await repository.find({ externalSourceId });

    expect(saveResult.isOk()).toBe(true);
    expect(findResult.isOk()).toBe(true);

    if (findResult.isOk()) {
      expect(findResult.value?.id).toBe(source.id);
      expect(findResult.value?.getProps().contentSnapshot.value).toEqual({
        content: '# Source note',
        fingerprint: 'fingerprint-1',
        size: byteSize('# Source note'),
      });
    }
  });

  it('source를 갱신한다', async () => {
    const externalSourceId = 'Notes/update-source.md';
    const source = createSourceFixture({ externalSourceId });
    await repository.save(source);

    source
      .syncContentSnapshot({
        content: '# Changed source note',
        fingerprint: 'fingerprint-2',
        size: byteSize('# Changed source note'),
      })
      ._unsafeUnwrap();

    const saveResult = await repository.save(source);
    const findResult = await repository.find({ externalSourceId });

    expect(saveResult.isOk()).toBe(true);

    if (findResult.isOk()) {
      expect(findResult.value?.getProps().contentSnapshot.value).toEqual({
        content: '# Changed source note',
        fingerprint: 'fingerprint-2',
        size: byteSize('# Changed source note'),
      });
    }
  });

  it('externalSourceId unique 충돌을 state conflict로 매핑한다', async () => {
    const externalSourceId = 'Notes/conflict-source.md';
    const firstSource = createSourceFixture({ externalSourceId });
    const secondSource = createSourceFixture({
      externalSourceId,
      content: '# Another source note',
      fingerprint: 'fingerprint-2',
    });

    await repository.save(firstSource);

    const result = await repository.save(secondSource);

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error.kind).toBe('state_conflict');
      expect(result.error.code).toBe('source_repository.state_conflict');
    }
  });
});
