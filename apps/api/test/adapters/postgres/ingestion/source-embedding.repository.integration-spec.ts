import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { type SourceEmbeddingRepository } from '@contexts/ingestion/domain';
import { SOURCE_EMBEDDING_REPOSITORY } from '@contexts/ingestion/ingestion.di-tokens';
import { type SourceRepository } from '@contexts/sources/domain';
import { SOURCE_REPOSITORY } from '@contexts/sources/sources.di-tokens';
import { AppModule } from '@platform/nest/app.module';
import {
  buildSourceEmbedding,
  VALID_EMBEDDING,
} from '../../../support/domains/fixtures/source-embedding.fixture';
import { buildSource } from '../../../support/domains/fixtures/source.fixture';

describe('SourceEmbeddingDrizzleRepository', () => {
  let app: INestApplication;
  let sourceRepository: SourceRepository;
  let repository: SourceEmbeddingRepository;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    sourceRepository = app.get<SourceRepository>(SOURCE_REPOSITORY);
    repository = app.get<SourceEmbeddingRepository>(
      SOURCE_EMBEDDING_REPOSITORY,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('source embedding을 저장한다', async () => {
    const source = await sourceRepository.save(
      buildSource({
        externalSourceId: 'Notes/source-embedding-source.md',
      }),
    );
    const sourceEmbedding = buildSourceEmbedding({ sourceId: source.id });

    await expect(repository.save(sourceEmbedding)).resolves.not.toThrow();
  });

  it('같은 sourceId로 다시 저장하면 청크를 교체한다', async () => {
    const source = await sourceRepository.save(
      buildSource({
        externalSourceId: 'Notes/source-embedding-upsert.md',
      }),
    );
    const updatedEmbedding = VALID_EMBEDDING.map((v) => v + 0.001);

    await repository.save(buildSourceEmbedding({ sourceId: source.id }));
    await expect(
      repository.save(
        buildSourceEmbedding({
          sourceId: source.id,
          chunks: [
            {
              chunkIndex: 0,
              chunkContent: 'updated',
              embedding: updatedEmbedding,
            },
          ],
        }),
      ),
    ).resolves.not.toThrow();
  });

  it('복수 청크를 저장하고 chunkIndex 오름차순으로 반환한다', async () => {
    const source = await sourceRepository.save(
      buildSource({
        externalSourceId: 'Notes/source-embedding-multi-chunk.md',
      }),
    );
    const sourceEmbedding = buildSourceEmbedding({
      sourceId: source.id,
      chunks: [
        { chunkIndex: 0, chunkContent: 'first chunk' },
        { chunkIndex: 1, chunkContent: 'second chunk' },
        { chunkIndex: 2, chunkContent: 'third chunk' },
      ],
    });
    await repository.save(sourceEmbedding);

    const result = await repository.find({ sourceId: source.id });

    expect(result).not.toBeNull();
    expect(result?.getProps().chunks).toHaveLength(3);
    expect(result?.getProps().chunks[0].unpack().chunkContent).toBe(
      'first chunk',
    );
    expect(result?.getProps().chunks[2].unpack().chunkContent).toBe(
      'third chunk',
    );
  });

  it('sourceId로 source embedding을 반환한다', async () => {
    const source = await sourceRepository.save(
      buildSource({
        externalSourceId: 'Notes/source-embedding-find.md',
      }),
    );
    const sourceEmbedding = buildSourceEmbedding({ sourceId: source.id });
    await repository.save(sourceEmbedding);

    const result = await repository.find({ sourceId: source.id });

    expect(result).not.toBeNull();
    expect(result?.id).toBe(source.id);
    expect(result?.getProps().model.unpack()).toBe('qwen3-embedding:0.6b');
  });

  it('source embedding이 없으면 null을 반환한다', async () => {
    const result = await repository.find({
      sourceId: 'non-existent-source',
    });

    expect(result).toBeNull();
  });
});
