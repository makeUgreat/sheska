import { Injectable } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { type Job } from 'bullmq';
import {
  EMBED_RESULTS_QUEUE,
  type EmbedResultPayload,
} from '@contexts/ingestion/application/ports';
import { SaveEmbeddingResultUseCase } from '@contexts/ingestion/application/use-cases/save-embedding-result.use-case';

@Processor(EMBED_RESULTS_QUEUE)
@Injectable()
export class EmbedResultBullMqConsumer extends WorkerHost {
  constructor(private readonly useCase: SaveEmbeddingResultUseCase) {
    super();
  }

  async process(job: Job<EmbedResultPayload>): Promise<void> {
    await this.useCase.execute(job.data);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<EmbedResultPayload> | undefined, error: Error): void {
    if (!job) return;
    this.useCase.handleFailure(job.data, error, {
      jobId: job.id,
      attemptsMade: job.attemptsMade,
    });
  }
}
