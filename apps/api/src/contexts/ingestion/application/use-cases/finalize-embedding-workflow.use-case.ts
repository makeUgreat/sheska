import { Inject, Injectable } from '@nestjs/common';
import { StateConflictError } from '@core/errors';
import {
  INTEGRATION_EVENT_DISPATCHER,
  type IntegrationEventDispatcher,
} from '@kernels/application';
import { SourceEmbedding } from '@contexts/ingestion/domain';
import {
  IngestionCompletedIntegrationEvent,
  IngestionFailedIntegrationEvent,
} from '@contexts/ingestion/application/events/ingestion.integration-event';
import { type EmbedSourceChunkResult } from '@contexts/ingestion/application/use-cases/embed-source-chunk.use-case';
import { type IngestionUnitOfWork } from '@contexts/ingestion/application/ports';
import { INGESTION_UNIT_OF_WORK } from '@contexts/ingestion/ingestion.di-tokens';

export interface FinalizeEmbeddingWorkflowCommand {
  readonly sourceId: string;
  readonly syncJobId: string;
  readonly totalChunks: number;
}

@Injectable()
export class FinalizeEmbeddingWorkflowUseCase {
  constructor(
    @Inject(INGESTION_UNIT_OF_WORK)
    private readonly unitOfWork: IngestionUnitOfWork,
    @Inject(INTEGRATION_EVENT_DISPATCHER)
    private readonly integrationEventDispatcher: IntegrationEventDispatcher,
  ) {}

  async execute(
    command: FinalizeEmbeddingWorkflowCommand,
    chunks: readonly EmbedSourceChunkResult[],
  ): Promise<void> {
    const { syncJobId, totalChunks } = command;
    this.ensureCompleteChunkResults(command, chunks);

    const sourceEmbedding = this.assembleSourceEmbedding(command, chunks);
    const completedEvent = new IngestionCompletedIntegrationEvent({
      syncJobId,
      totalChunks,
    });

    await this.unitOfWork.execute(async ({ sourceEmbeddings, outbox }) => {
      await sourceEmbeddings.upsert(sourceEmbedding);
      await outbox.append(completedEvent);
    });
  }

  async handleFailure(
    command: FinalizeEmbeddingWorkflowCommand,
  ): Promise<void> {
    const failedEvent = new IngestionFailedIntegrationEvent({
      syncJobId: command.syncJobId,
    });
    await this.integrationEventDispatcher.dispatch(failedEvent);
  }

  private assembleSourceEmbedding(
    command: FinalizeEmbeddingWorkflowCommand,
    chunks: readonly EmbedSourceChunkResult[],
  ): SourceEmbedding {
    const models = [...new Set(chunks.map((chunk) => chunk.model))];
    const hasInconsistentModels = models.length > 1;
    if (hasInconsistentModels) {
      throw new StateConflictError({
        code: 'ingestion.embedding_workflow_models_inconsistent',
        message: 'Embedding workflow returned inconsistent models',
        details: {
          syncJobId: command.syncJobId,
          models,
        },
      });
    }

    const sortedChunks = [...chunks].sort(
      (left, right) => left.chunkIndex - right.chunkIndex,
    );

    return SourceEmbedding.create({
      sourceId: command.sourceId,
      model: models[0],
      chunks: sortedChunks,
    });
  }

  private ensureCompleteChunkResults(
    command: FinalizeEmbeddingWorkflowCommand,
    chunks: readonly EmbedSourceChunkResult[],
  ): void {
    const hasNoChunkResults = chunks.length === 0;
    const hasUnexpectedChunkCount = chunks.length !== command.totalChunks;
    if (hasNoChunkResults || hasUnexpectedChunkCount) {
      throw new StateConflictError({
        code: 'ingestion.embedding_workflow_result_incomplete',
        message: 'Embedding workflow result is incomplete',
        details: {
          syncJobId: command.syncJobId,
          expectedChunks: command.totalChunks,
          actualChunks: chunks.length,
        },
      });
    }
  }
}
