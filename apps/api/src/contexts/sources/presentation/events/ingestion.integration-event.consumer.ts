import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApplyIngestionUpdateUseCase } from '@contexts/sources/application/use-cases/apply-ingestion-update.use-case';
import {
  ingestionCompletedIntegrationEventSchema,
  ingestionFailedIntegrationEventSchema,
} from './dto/ingestion.integration-event.dto';

@Injectable()
export class IngestionIntegrationEventConsumer {
  constructor(
    @Inject(ApplyIngestionUpdateUseCase)
    private readonly applyIngestionUpdate: ApplyIngestionUpdateUseCase,
  ) {}

  @OnEvent('source.ingestion.completed')
  async onCompleted(message: unknown): Promise<void> {
    const { payload } = ingestionCompletedIntegrationEventSchema.parse(message);
    await this.applyIngestionUpdate.execute({
      kind: 'completed',
      syncJobId: payload.syncJobId,
      totalChunks: payload.totalChunks,
    });
  }

  @OnEvent('source.ingestion.failed')
  async onFailed(message: unknown): Promise<void> {
    const { payload } = ingestionFailedIntegrationEventSchema.parse(message);
    await this.applyIngestionUpdate.execute({
      kind: 'failed',
      syncJobId: payload.syncJobId,
    });
  }
}
