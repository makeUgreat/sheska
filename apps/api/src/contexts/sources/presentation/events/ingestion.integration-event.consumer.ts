import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApplyIngestionUpdateUseCase } from '@contexts/sources/application/use-cases/apply-ingestion-update.use-case';
import {
  INGESTION_COMPLETED_EVENT_TYPE,
  INGESTION_FAILED_EVENT_TYPE,
  INGESTION_PROGRESS_EVENT_TYPE,
  INGESTION_STARTED_EVENT_TYPE,
  ingestionCompletedIntegrationEventSchema,
  ingestionFailedIntegrationEventSchema,
  ingestionProgressIntegrationEventSchema,
  ingestionStartedIntegrationEventSchema,
} from './schema/ingestion.integration-event.schema';

@Injectable()
export class IngestionIntegrationEventConsumer {
  constructor(
    @Inject(ApplyIngestionUpdateUseCase)
    private readonly applyIngestionUpdate: ApplyIngestionUpdateUseCase,
  ) {}

  @OnEvent(INGESTION_STARTED_EVENT_TYPE)
  async onStarted(message: unknown): Promise<void> {
    const { payload } = ingestionStartedIntegrationEventSchema.parse(message);
    await this.applyIngestionUpdate.execute({
      kind: 'started',
      syncJobId: payload.syncJobId,
      totalChunks: payload.totalChunks,
    });
  }

  @OnEvent(INGESTION_PROGRESS_EVENT_TYPE)
  async onProgress(message: unknown): Promise<void> {
    const { payload } = ingestionProgressIntegrationEventSchema.parse(message);
    await this.applyIngestionUpdate.execute({
      kind: 'progress',
      syncJobId: payload.syncJobId,
      processedChunks: payload.processedChunks,
    });
  }

  @OnEvent(INGESTION_COMPLETED_EVENT_TYPE)
  async onCompleted(message: unknown): Promise<void> {
    const { payload } = ingestionCompletedIntegrationEventSchema.parse(message);
    await this.applyIngestionUpdate.execute({
      kind: 'completed',
      syncJobId: payload.syncJobId,
    });
  }

  @OnEvent(INGESTION_FAILED_EVENT_TYPE)
  async onFailed(message: unknown): Promise<void> {
    const { payload } = ingestionFailedIntegrationEventSchema.parse(message);
    await this.applyIngestionUpdate.execute({
      kind: 'failed',
      syncJobId: payload.syncJobId,
    });
  }
}
