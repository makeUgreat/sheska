import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InitiateSourceEmbeddingUseCase } from '@contexts/ingestion/application/use-cases/initiate-source-embedding.use-case';
import { sourceSyncJobCreatedIntegrationEventSchema } from './schema/source-sync-job-created.integration-event.schema';

@Injectable()
export class SourceSyncJobCreatedIntegrationEventConsumer {
  constructor(
    private readonly initiateSourceEmbedding: InitiateSourceEmbeddingUseCase,
  ) {}

  @OnEvent('source.sync_job.created')
  async handle(message: unknown): Promise<void> {
    const event = sourceSyncJobCreatedIntegrationEventSchema.parse(message);

    await this.initiateSourceEmbedding.execute({
      ...event.payload,
    });
  }
}
