import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { type SourceVectorRepository } from '@contexts/ingestion/domain';
import { SOURCE_VECTOR_REPOSITORY } from '@contexts/ingestion/ingestion.di-tokens';
import { type SourceRepository } from '@contexts/sources/domain';
import { SOURCE_REPOSITORY } from '@contexts/sources/sources.di-tokens';
import { AppModule } from '@platform/nest/app.module';
import {
  buildSourceVector,
  VALID_EMBEDDING,
} from '../../../support/domains/fixtures/source-vector.fixture';
import { buildSource } from '../../../support/domains/fixtures/source.fixture';

describe('SourceVectorDrizzleRepository', () => {
  let app: INestApplication;
  let sourceRepository: SourceRepository;
  let repository: SourceVectorRepository;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    sourceRepository = app.get<SourceRepository>(SOURCE_REPOSITORY);
    repository = app.get<SourceVectorRepository>(SOURCE_VECTOR_REPOSITORY);
  });

  afterAll(async () => {
    await app.close();
  });

  it('source vector를 저장한다', async () => {
    const source = await sourceRepository.save(
      buildSource({
        externalSourceId: 'Notes/source-vector-source.md',
      }),
    );
    const sourceVector = buildSourceVector({
      sourceId: source.id,
    });

    await expect(repository.save(sourceVector)).resolves.not.toThrow();
  });

  it('같은 sourceId로 다시 저장하면 embedding을 덮어쓴다', async () => {
    const source = await sourceRepository.save(
      buildSource({
        externalSourceId: 'Notes/source-vector-upsert.md',
      }),
    );
    const updatedEmbedding = VALID_EMBEDDING.map((v) => v + 0.001);

    await repository.save(buildSourceVector({ sourceId: source.id }));
    await expect(
      repository.save(
        buildSourceVector({
          sourceId: source.id,
          embedding: updatedEmbedding,
        }),
      ),
    ).resolves.not.toThrow();
  });

  it('sourceId로 source vector를 반환한다', async () => {
    const source = await sourceRepository.save(
      buildSource({
        externalSourceId: 'Notes/source-vector-find.md',
      }),
    );
    const sourceVector = buildSourceVector({ sourceId: source.id });
    await repository.save(sourceVector);

    const result = await repository.find({ sourceId: source.id });

    expect(result).not.toBeNull();
    expect(result?.id).toBe(source.id);
    expect(result?.getProps().model.unpack()).toBe('qwen3-embedding:0.6b');
  });

  it('source vector가 없으면 null을 반환한다', async () => {
    const result = await repository.find({
      sourceId: 'non-existent-source',
    });

    expect(result).toBeNull();
  });
});
