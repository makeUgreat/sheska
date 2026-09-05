import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IngestionFailedDomainEvent,
  IngestionProgressDomainEvent,
  IngestionStartedDomainEvent,
} from '@contexts/ingestion/domain';
import {
  type Embedder,
  type EmbedRequestPayload,
  type EmbedResultChunk,
  type EmbedResultDispatcher,
} from '@contexts/ingestion/application/ports';
import {
  EMBEDDER,
  EMBED_RESULT_DISPATCHER,
} from '@contexts/ingestion/ingestion.di-tokens';
import { RecursiveCharacterChunker } from '@contexts/ingestion/application/services/recursive-character.chunker';

@Injectable()
export class EmbedSourceContentUseCase {
  constructor(
    @Inject(EMBEDDER)
    private readonly embedder: Embedder,
    @Inject(EMBED_RESULT_DISPATCHER)
    private readonly embedResultDispatcher: EmbedResultDispatcher,
    private readonly eventEmitter: EventEmitter2,
    private readonly chunker: RecursiveCharacterChunker,
  ) {}

  // TODO: add retry logic for embedder call failures
  async execute(payload: EmbedRequestPayload): Promise<void> {
    const { sourceId, syncJobId, content } = payload;

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

    await this.embedResultDispatcher.enqueue({
      sourceId,
      syncJobId,
      model,
      chunks: embedChunks,
    });
  }

  handleFailure(payload: EmbedRequestPayload): void {
    const event = new IngestionFailedDomainEvent({
      aggregateId: payload.syncJobId,
      syncJobId: payload.syncJobId,
    });
    this.eventEmitter.emit(event.eventName, event);
  }
}
