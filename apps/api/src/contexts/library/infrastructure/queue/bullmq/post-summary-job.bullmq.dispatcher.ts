import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { type Queue } from 'bullmq';
import { POST_SUMMARY_QUEUE, type PostSummaryJob, type PostSummaryJobDispatcher } from '@contexts/library/application/ports';

@Injectable()
export class PostSummaryJobBullMqDispatcher implements PostSummaryJobDispatcher {
  constructor(
    @InjectQueue(POST_SUMMARY_QUEUE)
    private readonly queue: Queue,
  ) {}

  async dispatch({ postId, fingerprint }: PostSummaryJob): Promise<void> {
    await this.queue.add(
      'generate-post-summary',
      { postId },
      {
        jobId: `${postId}-${fingerprint}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 120_000 },
      },
    );
  }
}
