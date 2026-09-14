import { Inject, Injectable } from '@nestjs/common';
import {
  INTEGRATION_EVENT_DISPATCHER,
  type IntegrationEventDispatcher,
} from '@kernels/application';
import {
  SourceEmbedding,
  type SourceEmbeddingRepository,
} from '@contexts/ingestion/domain';
import {
  IngestionCompletedIntegrationEvent,
  IngestionFailedIntegrationEvent,
} from '@contexts/ingestion/application/events/ingestion.integration-event';
import { type EmbedResultPayload } from '@contexts/ingestion/application/ports';
import { SOURCE_EMBEDDING_REPOSITORY } from '@contexts/ingestion/ingestion.di-tokens';

@Injectable()
export class SaveEmbeddingResultUseCase {
  constructor(
    @Inject(SOURCE_EMBEDDING_REPOSITORY)
    private readonly sourceEmbeddings: SourceEmbeddingRepository,
    @Inject(INTEGRATION_EVENT_DISPATCHER)
    private readonly integrationEventDispatcher: IntegrationEventDispatcher,
  ) {}

  async execute(payload: EmbedResultPayload): Promise<void> {
    const { sourceId, syncJobId, model, chunks } = payload;
    const sourceEmbedding = SourceEmbedding.create({ sourceId, model, chunks });
    await this.sourceEmbeddings.save(sourceEmbedding);
    const event = new IngestionCompletedIntegrationEvent({ syncJobId });
    await this.integrationEventDispatcher.dispatch(event);
  }

  async handleFailure(payload: EmbedResultPayload): Promise<void> {
    const event = new IngestionFailedIntegrationEvent({
      syncJobId: payload.syncJobId,
    });
    await this.integrationEventDispatcher.dispatch(event);
  }
}
