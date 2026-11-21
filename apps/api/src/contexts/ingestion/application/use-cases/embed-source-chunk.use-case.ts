import { Inject, Injectable } from '@nestjs/common';
import { type CallContext } from '@core/call-context';
import { IngestionFailedIntegrationEvent } from '@contexts/ingestion/application/events/ingestion.integration-event';
import { type IngestionUnitOfWork, type TextEmbedder } from '@contexts/ingestion/application/ports';
import { INGESTION_UNIT_OF_WORK, TEXT_EMBEDDER } from '@contexts/ingestion/ingestion.di-tokens';

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
    @Inject(TEXT_EMBEDDER)
    private readonly embedder: TextEmbedder,
    @Inject(INGESTION_UNIT_OF_WORK)
    private readonly unitOfWork: IngestionUnitOfWork,
  ) {}

  async execute(payload: EmbedSourceChunkCommand, context: CallContext): Promise<EmbedSourceChunkResult> {
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
    const failedEvent = new IngestionFailedIntegrationEvent({
      syncJobId: payload.syncJobId,
    });
    await this.unitOfWork.execute(({ outbox }) => outbox.append(failedEvent));
  }
}
