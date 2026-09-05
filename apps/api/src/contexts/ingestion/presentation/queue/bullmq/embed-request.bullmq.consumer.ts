import { Injectable } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { type Job } from 'bullmq';
import {
  EMBED_REQUESTS_QUEUE,
  type EmbedRequestPayload,
} from '@contexts/ingestion/application/ports';
import { EmbedSourceContentUseCase } from '@contexts/ingestion/application/use-cases/embed-source-content.use-case';

@Processor(EMBED_REQUESTS_QUEUE)
@Injectable()
export class EmbedRequestBullMqConsumer extends WorkerHost {
  constructor(private readonly useCase: EmbedSourceContentUseCase) {
    super();
  }

  async process(job: Job<EmbedRequestPayload>): Promise<void> {
    await this.useCase.execute(job.data);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<EmbedRequestPayload> | undefined, error: Error): void {
    if (!job) return;
    this.useCase.handleFailure(job.data, error, {
      jobId: job.id,
      attemptsMade: job.attemptsMade,
    });
  }
}
