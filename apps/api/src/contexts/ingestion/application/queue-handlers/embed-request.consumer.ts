import { Inject, Injectable } from '@nestjs/common';
import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { type Job, type Queue } from 'bullmq';
import {
  LOGGER,
  type LoggerPort,
  toErrorLogContext,
} from '@kernels/application';
import {
  IngestionFailedDomainEvent,
  IngestionProgressDomainEvent,
  IngestionStartedDomainEvent,
} from '@contexts/ingestion/domain';
import { type Embedder } from '@contexts/ingestion/application/ports';
import { EMBEDDER } from '@contexts/ingestion/ingestion.di-tokens';
import { RecursiveCharacterChunker } from '@contexts/ingestion/application/services/recursive-character.chunker';
import {
  EMBED_RESULTS_QUEUE,
  type EmbedResultChunk,
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
    @Inject(LOGGER)
    private readonly logger: LoggerPort,
    private readonly chunker: RecursiveCharacterChunker,
  ) {
    super();
  }

  // TODO: add retry logic for Ollama call failures
  async process(job: Job<EmbedRequestPayload>): Promise<void> {
    const { sourceId, syncJobId, content } = job.data;

    const chunks = this.chunker.chunk(content);
    const startedEvent = new IngestionStartedDomainEvent({
      aggregateId: syncJobId,
      syncJobId,
      totalChunks: chunks.length,
    });
    this.eventEmitter.emit(startedEvent.eventName, startedEvent);

    // Chunks are embedded one at a time (not in parallel) because the embedding
    // server runs on a single CPU inference slot; concurrent requests would only
    // queue up on the server and compound toward the client timeout.
    const embedChunks: EmbedResultChunk[] = [];
    let model = '';

    for (const chunk of chunks) {
      const result = await this.embedder.embed(chunk.content);
      model = result.model;
      embedChunks.push({
        chunkIndex: chunk.index,
        chunkContent: chunk.content,
        embedding: result.embedding,
      });

      const progressEvent = new IngestionProgressDomainEvent({
        aggregateId: syncJobId,
        syncJobId,
        processedChunks: embedChunks.length,
        totalChunks: chunks.length,
      });
      this.eventEmitter.emit(progressEvent.eventName, progressEvent);
    }

    await this.resultsQueue.add('embed-result', {
      sourceId,
      syncJobId,
      model,
      chunks: embedChunks,
    } satisfies EmbedResultPayload);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<EmbedRequestPayload> | undefined, error: Error): void {
    if (!job) return;
    this.logger.error('Embed request failed', {
      jobId: job.id,
      sourceId: job.data.sourceId,
      syncJobId: job.data.syncJobId,
      attemptsMade: job.attemptsMade,
      ...toErrorLogContext(error),
    });
    const event = new IngestionFailedDomainEvent({
      aggregateId: job.data.syncJobId,
      syncJobId: job.data.syncJobId,
    });
    this.eventEmitter.emit(event.eventName, event);
  }
}
