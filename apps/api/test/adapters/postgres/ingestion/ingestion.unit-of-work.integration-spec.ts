import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { type IngestionUnitOfWork } from '@contexts/ingestion/application/ports';
import { IngestionCompletedIntegrationEvent } from '@contexts/ingestion/application/events/ingestion.integration-event';
import { type SourceEmbeddingRepository } from '@contexts/ingestion/domain';
import { INGESTION_UNIT_OF_WORK, SOURCE_EMBEDDING_REPOSITORY } from '@contexts/ingestion/ingestion.di-tokens';
import { type SourceRepository } from '@contexts/library/domain';
import { SOURCE_REPOSITORY } from '@contexts/library/library.di-tokens';
import { DATABASE_TOKENS, outboxMessages } from '@kernels/infrastructure';
import { type ApiDrizzleDatabase } from '@platform/nest/database/drizzle-postgres.provider';
import { SourcePgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/source.pg-drizzle.repository';
import { SourceEmbeddingPgDrizzleRepository } from '@contexts/ingestion/infrastructure/persistence/postgres-drizzle/source-embedding.pg-drizzle.repository';
import { IngestionPgDrizzleUnitOfWork } from '@contexts/ingestion/infrastructure/persistence/postgres-drizzle/ingestion.pg-drizzle.unit-of-work';
import { buildSourceEmbedding } from '../../../support/domains/fixtures/source-embedding.fixture';
import { buildSource } from '../../../support/domains/fixtures/source.fixture';
import { setupPostgresTestingModule } from '../support/setup-postgres-testing-module';

describe('IngestionPgDrizzleUnitOfWork', () => {
  let testingModule: TestingModule;
  let database: ApiDrizzleDatabase;
  let unitOfWork: IngestionUnitOfWork;
  let sources: SourceRepository;
  let sourceEmbeddings: SourceEmbeddingRepository;

  beforeAll(async () => {
    testingModule = await setupPostgresTestingModule([
      { provide: SOURCE_REPOSITORY, useClass: SourcePgDrizzleRepository },
      { provide: SOURCE_EMBEDDING_REPOSITORY, useClass: SourceEmbeddingPgDrizzleRepository },
      { provide: INGESTION_UNIT_OF_WORK, useClass: IngestionPgDrizzleUnitOfWork },
    ]);

    database = testingModule.get(DATABASE_TOKENS.drizzleDatabase);
    unitOfWork = testingModule.get(INGESTION_UNIT_OF_WORK);
    sources = testingModule.get(SOURCE_REPOSITORY);
    sourceEmbeddings = testingModule.get(SOURCE_EMBEDDING_REPOSITORY);
  });

  afterAll(async () => {
    await testingModule.close();
  });

  // nocap: ingestion-sourceEmbedding-5
  it('source embedding과 completed event를 함께 commit한다', async () => {
    const source = await sources.insert(
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
      await resources.sourceEmbeddings.upsert(sourceEmbedding);
      await resources.outbox.append(completedEvent);
    });

    await expect(sourceEmbeddings.find({ sourceId: source.id })).resolves.not.toBeNull();
    await expect(findOutboxMessage(completedEvent.eventId)).resolves.toHaveLength(1);
  });

  // nocap: ingestion-sourceEmbedding-5
  it('transaction callback이 실패하면 embedding과 outbox event를 함께 rollback한다', async () => {
    const source = await sources.insert(
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
        await resources.sourceEmbeddings.upsert(sourceEmbedding);
        await resources.outbox.append(completedEvent);
        throw transactionFailure;
      }),
    ).rejects.toBe(transactionFailure);

    await expect(sourceEmbeddings.find({ sourceId: source.id })).resolves.toBeNull();
    await expect(findOutboxMessage(completedEvent.eventId)).resolves.toHaveLength(0);
  });

  function findOutboxMessage(eventId: string) {
    return database.select().from(outboxMessages).where(eq(outboxMessages.eventId, eventId));
  }
});
