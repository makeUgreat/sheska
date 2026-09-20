import { Inject, Injectable } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { type Job } from 'bullmq';
import { callContext } from '@core/call-context';
import { LOGGER, type LoggerPort } from '@kernels/application';
import { SOURCE_EMBEDDING_CHUNK_QUEUE } from '@contexts/ingestion/application/ports';
import { EmbedSourceChunkUseCase } from '@contexts/ingestion/application/use-cases/embed-source-chunk.use-case';
import {
  embedSourceChunkJobInputSchema,
  type EmbedSourceChunkJobInput,
} from './dto/embed-source-chunk.job-input.dto';
import { type EmbedSourceChunkJobOutput } from './dto/embed-source-chunk.job-output.dto';

@Processor(SOURCE_EMBEDDING_CHUNK_QUEUE)
@Injectable()
export class SourceEmbeddingChunkBullMqConsumer extends WorkerHost {
  constructor(
    private readonly embedSourceChunk: EmbedSourceChunkUseCase,
    @Inject(LOGGER)
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async process(
    job: Job<EmbedSourceChunkJobInput>,
  ): Promise<EmbedSourceChunkJobOutput> {
    const input = embedSourceChunkJobInputSchema.parse(job.data);
    const result = await this.embedSourceChunk.execute(
      {
        sourceId: input.sourceId,
        syncJobId: input.syncJobId,
        chunkIndex: input.chunkIndex,
        chunkContent: input.chunkContent,
      },
      callContext({ deadlineMs: 90_000, maxRetries: 0 }),
    );

    await job.updateProgress(100);
    return {
      kind: 'chunk',
      chunkIndex: result.chunkIndex,
      chunkContent: result.chunkContent,
      model: result.model,
      embedding: result.embedding,
    };
  }

  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<EmbedSourceChunkJobInput> | undefined,
    error: Error,
  ): Promise<void> {
    if (!job) return;

    const maxAttempts = job.opts.attempts ?? 1;
    const context = {
      queueName: job.queueName,
      jobId: job.id,
      attempt: job.attemptsMade,
      maxAttempts,
    };

    if (job.attemptsMade < maxAttempts) {
      this.logger.warn(`${job.queueName} job attempt failed`, error, context);
      return;
    }

    this.logger.error(`${job.queueName} job failed`, error, context);

    const input = embedSourceChunkJobInputSchema.safeParse(job.data);
    if (!input.success) {
      this.logger.error(
        `${job.queueName} job failure compensation skipped`,
        input.error,
        context,
      );
      return;
    }

    try {
      await this.embedSourceChunk.handleFailure({
        sourceId: input.data.sourceId,
        syncJobId: input.data.syncJobId,
        chunkIndex: input.data.chunkIndex,
        chunkContent: input.data.chunkContent,
      });
    } catch (compensationError: unknown) {
      this.logger.error(
        `${job.queueName} job failure compensation failed`,
        compensationError,
        context,
      );
    }
  }
}
