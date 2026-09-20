import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { type IngestionUnitOfWork } from '@contexts/ingestion/application/ports';
import { IngestionCompletedIntegrationEvent } from '@contexts/ingestion/application/events/ingestion.integration-event';
import { type SourceEmbeddingRepository } from '@contexts/ingestion/domain';
import {
  INGESTION_UNIT_OF_WORK,
  SOURCE_EMBEDDING_REPOSITORY,
} from '@contexts/ingestion/ingestion.di-tokens';
import { type SourceRepository } from '@contexts/library/domain';
import { SOURCE_REPOSITORY } from '@contexts/library/library.di-tokens';
import { DATABASE_TOKENS, outboxMessages } from '@kernels/infrastructure';
import { type ApiDrizzleDatabase } from '@platform/nest/database/drizzle-postgres.provider';
import { AppModule } from '@platform/nest/app.module';
import { buildSourceEmbedding } from '../../../support/domains/fixtures/source-embedding.fixture';
import { buildSource } from '../../../support/domains/fixtures/source.fixture';

describe('IngestionPgDrizzleUnitOfWork', () => {
  let app: INestApplication;
  let database: ApiDrizzleDatabase;
  let unitOfWork: IngestionUnitOfWork;
  let sources: SourceRepository;
  let sourceEmbeddings: SourceEmbeddingRepository;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    database = app.get(DATABASE_TOKENS.drizzleDatabase);
    unitOfWork = app.get(INGESTION_UNIT_OF_WORK);
    sources = app.get(SOURCE_REPOSITORY);
    sourceEmbeddings = app.get(SOURCE_EMBEDDING_REPOSITORY);
  });

  afterAll(async () => {
    await app.close();
  });

  it('source embedding과 completed event를 함께 commit한다', async () => {
    const source = await sources.save(
      buildSource({
        externalSourceId: 'Notes/ingestion-uow-commit.md',
      }),
    );
    const sourceEmbedding = buildSourceEmbedding({ sourceId: source.id });
    const completedEvent = new IngestionCompletedIntegrationEvent({
      syncJobId: 'sync-job-uow-commit',
      totalChunks: 1,
    });

    await unitOfWork.execute(async (resources) => {
      await resources.sourceEmbeddings.save(sourceEmbedding);
      await resources.outbox.append(completedEvent);
    });

    await expect(
      sourceEmbeddings.find({ sourceId: source.id }),
    ).resolves.not.toBeNull();
    await expect(
      findOutboxMessage(completedEvent.eventId),
    ).resolves.toHaveLength(1);
  });

  it('transaction callback이 실패하면 embedding과 outbox event를 함께 rollback한다', async () => {
    const source = await sources.save(
      buildSource({
        externalSourceId: 'Notes/ingestion-uow-rollback.md',
      }),
    );
    const sourceEmbedding = buildSourceEmbedding({ sourceId: source.id });
    const completedEvent = new IngestionCompletedIntegrationEvent({
      syncJobId: 'sync-job-uow-rollback',
      totalChunks: 1,
    });
    const transactionFailure = new Error('transaction failed');

    await expect(
      unitOfWork.execute(async (resources) => {
        await resources.sourceEmbeddings.save(sourceEmbedding);
        await resources.outbox.append(completedEvent);
        throw transactionFailure;
      }),
    ).rejects.toBe(transactionFailure);

    await expect(
      sourceEmbeddings.find({ sourceId: source.id }),
    ).resolves.toBeNull();
    await expect(
      findOutboxMessage(completedEvent.eventId),
    ).resolves.toHaveLength(0);
  });

  function findOutboxMessage(eventId: string) {
    return database
      .select()
      .from(outboxMessages)
      .where(eq(outboxMessages.eventId, eventId));
  }
});
