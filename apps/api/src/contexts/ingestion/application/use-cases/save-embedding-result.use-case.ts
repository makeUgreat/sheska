import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IngestionCompletedDomainEvent,
  IngestionFailedDomainEvent,
  SourceEmbedding,
  type SourceEmbeddingRepository,
} from '@contexts/ingestion/domain';
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
    const event = new IngestionCompletedDomainEvent({
      aggregateId: syncJobId,
      syncJobId,
    });
    this.eventEmitter.emit(event.eventName, event);
  }

  handleFailure(payload: EmbedResultPayload): void {
    const event = new IngestionFailedDomainEvent({
      aggregateId: payload.syncJobId,
      syncJobId: payload.syncJobId,
    });
    this.eventEmitter.emit(event.eventName, event);
  }
}
