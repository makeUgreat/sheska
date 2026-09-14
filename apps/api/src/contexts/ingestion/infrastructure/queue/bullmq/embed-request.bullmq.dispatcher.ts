import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { type Queue } from 'bullmq';
import {
  EMBED_REQUESTS_QUEUE,
  type EmbedRequestDispatchOptions,
  type EmbedRequestDispatcher,
  type EmbedRequestPayload,
} from '@contexts/ingestion/application/ports';

@Injectable()
export class EmbedRequestBullMqDispatcher implements EmbedRequestDispatcher {
  constructor(
    @InjectQueue(EMBED_REQUESTS_QUEUE)
    private readonly queue: Queue,
  ) {}

  async enqueue(
    payload: EmbedRequestPayload,
    options?: EmbedRequestDispatchOptions,
  ): Promise<void> {
    if (options?.idempotencyKey) {
      await this.queue.add('embed-request', payload, {
        jobId: options.idempotencyKey,
      });
      return;
    }

    await this.queue.add('embed-request', payload);
  }
}
