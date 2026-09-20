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
      callContext({ deadlineMs: 90_000, maxRetries: 2 }),
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

    this.logger.error(`${job.queueName} job failed`, error, {
      queueName: job.queueName,
      jobId: job.id,
      attemptsMade: job.attemptsMade,
    });
    const input = embedSourceChunkJobInputSchema.parse(job.data);
    await this.embedSourceChunk.handleFailure({
      sourceId: input.sourceId,
      syncJobId: input.syncJobId,
      chunkIndex: input.chunkIndex,
      chunkContent: input.chunkContent,
    });
  }
}
