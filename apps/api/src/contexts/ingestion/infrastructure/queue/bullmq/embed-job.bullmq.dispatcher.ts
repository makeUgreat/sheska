import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { type Queue } from 'bullmq';
import {
  type EmbedJob,
  type EmbedJobDispatcher,
} from '@contexts/ingestion/application/ports';

export const EMBED_JOBS_QUEUE = 'embed-jobs';

@Injectable()
export class EmbedJobBullMqDispatcher implements EmbedJobDispatcher {
  constructor(
    @InjectQueue(EMBED_JOBS_QUEUE)
    private readonly queue: Queue<EmbedJob>,
  ) {}

  async dispatch(job: EmbedJob): Promise<void> {
    await this.queue.add('embed', job);
  }
}
