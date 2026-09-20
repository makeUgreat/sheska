import { Inject, Injectable } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { type Job } from 'bullmq';
import { LOGGER, type LoggerPort } from '@kernels/application';
import { SOURCE_EMBEDDING_FINALIZATION_QUEUE } from '@contexts/ingestion/application/ports';
import { type EmbedSourceChunkResult } from '@contexts/ingestion/application/use-cases/embed-source-chunk.use-case';
import { FinalizeEmbeddingWorkflowUseCase } from '@contexts/ingestion/application/use-cases/finalize-embedding-workflow.use-case';
import { embedSourceChunkJobOutputSchema } from './dto/embed-source-chunk.job-output.dto';
import {
  finalizeEmbeddingWorkflowJobInputSchema,
  type FinalizeEmbeddingWorkflowJobInput,
} from './dto/finalize-embedding-workflow.job-input.dto';

@Processor(SOURCE_EMBEDDING_FINALIZATION_QUEUE)
@Injectable()
export class SourceEmbeddingFinalizationBullMqConsumer extends WorkerHost {
  constructor(
    private readonly finalizeEmbeddingWorkflow: FinalizeEmbeddingWorkflowUseCase,
    @Inject(LOGGER)
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async process(job: Job<FinalizeEmbeddingWorkflowJobInput>): Promise<void> {
    const input = finalizeEmbeddingWorkflowJobInputSchema.parse(job.data);
    const childResults = await job.getChildrenValues<unknown>();
    const chunks: EmbedSourceChunkResult[] = Object.values(childResults)
      .map((result) => embedSourceChunkJobOutputSchema.parse(result))
      .map((result) => ({
        kind: 'chunk',
        chunkIndex: result.chunkIndex,
        chunkContent: result.chunkContent,
        model: result.model,
        embedding: result.embedding,
      }));

    await this.finalizeEmbeddingWorkflow.execute(
      {
        sourceId: input.sourceId,
        syncJobId: input.syncJobId,
        totalChunks: input.totalChunks,
      },
      chunks,
    );
  }

  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<FinalizeEmbeddingWorkflowJobInput> | undefined,
    error: Error,
  ): Promise<void> {
    if (!job) return;

    const context = {
      queueName: job.queueName,
      jobId: job.id,
      attemptsMade: job.attemptsMade,
    };

    this.logger.error(`${job.queueName} job failed`, error, context);

    const input = finalizeEmbeddingWorkflowJobInputSchema.safeParse(job.data);
    if (!input.success) {
      this.logger.error(
        `${job.queueName} job failure compensation skipped`,
        input.error,
        context,
      );
      return;
    }

    try {
      await this.finalizeEmbeddingWorkflow.handleFailure({
        sourceId: input.data.sourceId,
        syncJobId: input.data.syncJobId,
        totalChunks: input.data.totalChunks,
      });
    } catch (compensationError: unknown) {
      this.logger.error(
        `${job.queueName} job failure compensation failed`,
        compensationError,
        context,
      );
    }
  }

  @OnWorkerEvent('error')
  onError(error: Error): void {
    this.logger.error(
      `${SOURCE_EMBEDDING_FINALIZATION_QUEUE} worker error`,
      error,
      {
        queueName: SOURCE_EMBEDDING_FINALIZATION_QUEUE,
      },
    );
  }
}
