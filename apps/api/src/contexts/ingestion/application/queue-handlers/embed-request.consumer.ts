import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { type Job, type Queue } from 'bullmq';
import { IngestionFailedDomainEvent } from '@contexts/ingestion/domain';
import { type Embedder } from '@contexts/ingestion/application/ports';
import { EMBEDDER } from '@contexts/ingestion/ingestion.di-tokens';
import {
  EMBED_RESULTS_QUEUE,
  type EmbedResultPayload,
} from './embed-result.consumer';

export const EMBED_REQUESTS_QUEUE = 'embed-requests';

export interface EmbedRequestPayload {
  readonly sourceId: string;
  readonly syncJobId: string;
  readonly content: string;
}

@Processor(EMBED_REQUESTS_QUEUE)
@Injectable()
export class EmbedRequestConsumer extends WorkerHost {
  constructor(
    @Inject(EMBEDDER)
    private readonly embedder: Embedder,
    @InjectQueue(EMBED_RESULTS_QUEUE)
    private readonly resultsQueue: Queue,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  // TODO: add retry logic for Ollama call failures
  async process(job: Job<EmbedRequestPayload>): Promise<void> {
    const { sourceId, syncJobId, content } = job.data;
    const { embedding, model } = await this.embedder.embed(content);
    await this.resultsQueue.add('embed-result', {
      sourceId,
      syncJobId,
      embedding,
      model,
    } satisfies EmbedResultPayload);
  }

  onFailed(job: Job<EmbedRequestPayload> | undefined): void {
    if (!job) return;
    const event = new IngestionFailedDomainEvent({
      aggregateId: job.data.syncJobId,
      syncJobId: job.data.syncJobId,
    });
    this.eventEmitter.emit(event.eventName, event);
  }
}
