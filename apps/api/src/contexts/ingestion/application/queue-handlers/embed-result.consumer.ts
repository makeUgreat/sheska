import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { type Job } from 'bullmq';
import { LOGGER, type LoggerPort } from '@kernels/application';
import {
  IngestionCompletedDomainEvent,
  IngestionFailedDomainEvent,
  SourceVector,
  type SourceVectorRepository,
} from '@contexts/ingestion/domain';
import { SOURCE_VECTOR_REPOSITORY } from '@contexts/ingestion/ingestion.di-tokens';

export const EMBED_RESULTS_QUEUE = 'embed-results';

export interface EmbedResultChunk {
  readonly chunkIndex: number;
  readonly chunkContent: string;
  readonly embedding: number[];
}

export interface EmbedResultPayload {
  readonly sourceId: string;
  readonly syncJobId: string;
  readonly model: string;
  readonly chunks: EmbedResultChunk[];
}

@Processor(EMBED_RESULTS_QUEUE)
@Injectable()
export class EmbedResultConsumer extends WorkerHost {
  constructor(
    @Inject(SOURCE_VECTOR_REPOSITORY)
    private readonly sourceVectors: SourceVectorRepository,
    private readonly eventEmitter: EventEmitter2,
    @Inject(LOGGER)
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async process(job: Job<EmbedResultPayload>): Promise<void> {
    const { sourceId, syncJobId, model, chunks } = job.data;
    const sourceVector = SourceVector.create({ sourceId, model, chunks });
    await this.sourceVectors.save(sourceVector);
    const event = new IngestionCompletedDomainEvent({
      aggregateId: syncJobId,
      syncJobId,
    });
    this.eventEmitter.emit(event.eventName, event);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<EmbedResultPayload> | undefined): void {
    if (!job) return;
    this.logger.error('Embed result failed', {
      jobId: job.id,
      sourceId: job.data.sourceId,
      syncJobId: job.data.syncJobId,
      attemptsMade: job.attemptsMade,
    });
    const event = new IngestionFailedDomainEvent({
      aggregateId: job.data.syncJobId,
      syncJobId: job.data.syncJobId,
    });
    this.eventEmitter.emit(event.eventName, event);
  }
}
