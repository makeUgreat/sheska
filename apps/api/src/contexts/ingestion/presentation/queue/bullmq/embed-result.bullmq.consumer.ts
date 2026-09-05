import { Inject, Injectable } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { type Job } from 'bullmq';
import { LOGGER, type LoggerPort } from '@kernels/application';
import { type QueueJobFailureLogContext } from '@kernels/presentation';
import {
  EMBED_RESULTS_QUEUE,
  type EmbedResultPayload,
} from '@contexts/ingestion/application/ports';
import { SaveEmbeddingResultUseCase } from '@contexts/ingestion/application/use-cases/save-embedding-result.use-case';

@Processor(EMBED_RESULTS_QUEUE)
@Injectable()
export class EmbedResultBullMqConsumer extends WorkerHost {
  constructor(
    private readonly saveEmbeddingResult: SaveEmbeddingResultUseCase,
    @Inject(LOGGER)
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async process(job: Job<EmbedResultPayload>): Promise<void> {
    await this.saveEmbeddingResult.execute(job.data);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<EmbedResultPayload> | undefined, error: Error): void {
    if (!job) return;
    this.logger.error(`${job.queueName} job failed`, error, {
      queueName: job.queueName,
      jobId: job.id,
      attemptsMade: job.attemptsMade,
    } satisfies QueueJobFailureLogContext);
    this.saveEmbeddingResult.handleFailure(job.data);
  }
}
