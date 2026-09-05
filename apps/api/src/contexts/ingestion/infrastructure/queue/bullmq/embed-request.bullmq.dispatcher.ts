import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { type Queue } from 'bullmq';
import {
  EMBED_REQUESTS_QUEUE,
  type EmbedRequestDispatcher,
  type EmbedRequestPayload,
} from '@contexts/ingestion/application/ports';

@Injectable()
export class EmbedRequestBullMqDispatcher implements EmbedRequestDispatcher {
  constructor(
    @InjectQueue(EMBED_REQUESTS_QUEUE)
    private readonly queue: Queue,
  ) {}

  async enqueue(payload: EmbedRequestPayload): Promise<void> {
    await this.queue.add('embed-request', payload);
  }
}
