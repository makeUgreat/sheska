import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(payload: EmbedResultPayload): Promise<void> {
    const { sourceId, syncJobId, model, chunks } = payload;
    const sourceEmbedding = SourceEmbedding.create({ sourceId, model, chunks });
    await this.sourceEmbeddings.save(sourceEmbedding);
    const event = new IngestionCompletedIntegrationEvent({ syncJobId });
    this.eventEmitter.emit(event.eventType, event);
  }

  handleFailure(payload: EmbedResultPayload): void {
    const event = new IngestionFailedIntegrationEvent({
      syncJobId: payload.syncJobId,
    });
    this.eventEmitter.emit(event.eventType, event);
  }
}
