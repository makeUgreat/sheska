import { Inject, Injectable } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { type Job } from 'bullmq';
import { callContext } from '@core/call-context';
import { LOGGER, type LoggerPort } from '@kernels/application';
import { POST_SUMMARY_QUEUE } from '@contexts/library/application/ports';
import { GeneratePostSummaryUseCase } from '@contexts/library/application/use-cases/post-summary/generate-post-summary.use-case';
import { generatePostSummaryJobInputSchema, type GeneratePostSummaryJobInput } from './dto/generate-post-summary.job-input.dto';

@Processor(POST_SUMMARY_QUEUE)
@Injectable()
export class PostSummaryBullMqConsumer extends WorkerHost {
  constructor(
    private readonly generatePostSummary: GeneratePostSummaryUseCase,
    @Inject(LOGGER)
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async process(job: Job<GeneratePostSummaryJobInput>): Promise<void> {
    const input = generatePostSummaryJobInputSchema.parse(job.data);

    await this.generatePostSummary.execute({ postId: input.postId }, callContext({ deadlineMs: 90_000, maxRetries: 0 }));
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<GeneratePostSummaryJobInput> | undefined, error: Error): Promise<void> {
    if (!job) return;

    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) return;

    const context = {
      queueName: job.queueName,
      jobId: job.id,
      attempt: job.attemptsMade,
      maxAttempts,
    };
    this.logger.error(`${job.queueName} job failed`, error, context);

    const input = generatePostSummaryJobInputSchema.safeParse(job.data);
    if (!input.success) return;

    try {
      await this.generatePostSummary.handleFailure({ postId: input.data.postId });
    } catch (compensationError: unknown) {
      this.logger.error(`${job.queueName} job failure compensation failed`, compensationError, context);
    }
  }

  @OnWorkerEvent('error')
  onError(error: Error): void {
    this.logger.error(`${POST_SUMMARY_QUEUE} worker error`, error, {
      queueName: POST_SUMMARY_QUEUE,
    });
  }
}
