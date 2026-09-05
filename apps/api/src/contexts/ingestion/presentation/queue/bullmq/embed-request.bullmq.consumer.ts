import { Inject, Injectable } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { type Job } from 'bullmq';
import { LOGGER, type LoggerPort } from '@kernels/application';
import { type QueueJobFailureLogContext } from '@kernels/presentation';
import {
  EMBED_REQUESTS_QUEUE,
  type EmbedRequestPayload,
} from '@contexts/ingestion/application/ports';
import { EmbedSourceContentUseCase } from '@contexts/ingestion/application/use-cases/embed-source-content.use-case';

@Processor(EMBED_REQUESTS_QUEUE)
@Injectable()
export class EmbedRequestBullMqConsumer extends WorkerHost {
  constructor(
    private readonly embedSourceContent: EmbedSourceContentUseCase,
    @Inject(LOGGER)
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async process(job: Job<EmbedRequestPayload>): Promise<void> {
    await this.embedSourceContent.execute(job.data);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<EmbedRequestPayload> | undefined, error: Error): void {
    if (!job) return;
    this.logger.error(`${job.queueName} job failed`, error, {
      queueName: job.queueName,
      jobId: job.id,
      attemptsMade: job.attemptsMade,
    } satisfies QueueJobFailureLogContext);
    this.embedSourceContent.handleFailure(job.data);
  }
}
