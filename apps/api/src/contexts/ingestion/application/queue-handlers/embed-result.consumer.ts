import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { type Job } from 'bullmq';
import {
  IngestionCompletedDomainEvent,
  IngestionFailedDomainEvent,
  SourceVector,
  type SourceVectorRepository,
} from '@contexts/ingestion/domain';
import { SOURCE_VECTOR_REPOSITORY } from '@contexts/ingestion/ingestion.di-tokens';

export const EMBED_RESULTS_QUEUE = 'embed-results';

export interface EmbedResultPayload {
  readonly sourceId: string;
  readonly syncJobId: string;
  readonly embedding: number[];
  readonly model: string;
}

@Processor(EMBED_RESULTS_QUEUE)
@Injectable()
export class EmbedResultConsumer extends WorkerHost {
  constructor(
    @Inject(SOURCE_VECTOR_REPOSITORY)
    private readonly sourceVectors: SourceVectorRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<EmbedResultPayload>): Promise<void> {
    const { sourceId, syncJobId, embedding, model } = job.data;
    const sourceVector = SourceVector.create({ sourceId, embedding, model });
    await this.sourceVectors.save(sourceVector);
    const event = new IngestionCompletedDomainEvent({
      aggregateId: syncJobId,
      syncJobId,
    });
    this.eventEmitter.emit(event.eventName, event);
  }

  onFailed(job: Job<EmbedResultPayload> | undefined): void {
    if (!job) return;
    const event = new IngestionFailedDomainEvent({
      aggregateId: job.data.syncJobId,
      syncJobId: job.data.syncJobId,
    });
    this.eventEmitter.emit(event.eventName, event);
  }
}
