import { Inject, Injectable } from '@nestjs/common';
import { type CallContext } from '@core/call-context';
import {
  INTEGRATION_EVENT_DISPATCHER,
  type IntegrationEventDispatcher,
} from '@kernels/application';
import { IngestionFailedIntegrationEvent } from '@contexts/ingestion/application/events/ingestion.integration-event';
import { type Embedder } from '@contexts/ingestion/application/ports';
import { EMBEDDER } from '@contexts/ingestion/ingestion.di-tokens';

export interface EmbedSourceChunkCommand {
  readonly sourceId: string;
  readonly syncJobId: string;
  readonly chunkIndex: number;
  readonly chunkContent: string;
}

export interface EmbedSourceChunkResult {
  readonly kind: 'chunk';
  readonly chunkIndex: number;
  readonly chunkContent: string;
  readonly model: string;
  readonly embedding: number[];
}

@Injectable()
export class EmbedSourceChunkUseCase {
  constructor(
    @Inject(EMBEDDER)
    private readonly embedder: Embedder,
    @Inject(INTEGRATION_EVENT_DISPATCHER)
    private readonly integrationEventDispatcher: IntegrationEventDispatcher,
  ) {}

  async execute(
    payload: EmbedSourceChunkCommand,
    context: CallContext,
  ): Promise<EmbedSourceChunkResult> {
    const result = await this.embedder.embed(payload.chunkContent, context);

    return {
      kind: 'chunk',
      chunkIndex: payload.chunkIndex,
      chunkContent: payload.chunkContent,
      model: result.model,
      embedding: result.embedding,
    };
  }

  async handleFailure(payload: EmbedSourceChunkCommand): Promise<void> {
    await this.integrationEventDispatcher.dispatch(
      new IngestionFailedIntegrationEvent({
        syncJobId: payload.syncJobId,
      }),
    );
  }
}
