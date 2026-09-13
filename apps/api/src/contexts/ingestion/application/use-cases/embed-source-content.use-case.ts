import { Inject, Injectable } from '@nestjs/common';
import { type CallContext, type CallPolicy } from '@core/call-context';
import {
  INTEGRATION_EVENT_DISPATCHER,
  type IntegrationEventDispatcher,
} from '@kernels/application';
import {
  IngestionFailedIntegrationEvent,
  IngestionProgressIntegrationEvent,
  IngestionStartedIntegrationEvent,
} from '@contexts/ingestion/application/events/ingestion.integration-event';
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

export const EMBED_SOURCE_CONTENT_CALL_POLICY = {
  deadlineMs: 5 * 60_000,
  attemptTimeoutMs: 30_000,
} as const satisfies CallPolicy;

@Injectable()
export class EmbedSourceContentUseCase {
  constructor(
    @Inject(EMBEDDER)
    private readonly embedder: Embedder,
    @Inject(EMBED_RESULT_DISPATCHER)
    private readonly embedResultDispatcher: EmbedResultDispatcher,
    @Inject(INTEGRATION_EVENT_DISPATCHER)
    private readonly integrationEventDispatcher: IntegrationEventDispatcher,
    private readonly chunker: RecursiveCharacterChunker,
  ) {}

  async execute(
    payload: EmbedRequestPayload,
    context: CallContext,
  ): Promise<void> {
    const { sourceId, syncJobId, content } = payload;

    const chunks = this.chunker.chunk(content);
    const startedEvent = new IngestionStartedIntegrationEvent({
      syncJobId,
      totalChunks: chunks.length,
    });
    await this.integrationEventDispatcher.dispatch(startedEvent);

    // Chunks are embedded one at a time (not in parallel) because the embedding
    // server runs on a single CPU inference slot; concurrent requests would only
    // queue up on the server and compound toward the client timeout.
    const embedChunks: EmbedResultChunk[] = [];
    let model = '';

    for (const chunk of chunks) {
      const result = await this.embedder.embed(chunk.content, context);
      model = result.model;
      embedChunks.push({
        chunkIndex: chunk.index,
        chunkContent: chunk.content,
        embedding: result.embedding,
      });

      const progressEvent = new IngestionProgressIntegrationEvent({
        syncJobId,
        processedChunks: embedChunks.length,
        totalChunks: chunks.length,
      });
      await this.integrationEventDispatcher.dispatch(progressEvent);
    }

    await this.embedResultDispatcher.enqueue({
      sourceId,
      syncJobId,
      model,
      chunks: embedChunks,
    });
  }

  async handleFailure(payload: EmbedRequestPayload): Promise<void> {
    const event = new IngestionFailedIntegrationEvent({
      syncJobId: payload.syncJobId,
    });
    await this.integrationEventDispatcher.dispatch(event);
  }
}
