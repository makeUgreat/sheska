import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { type Queue } from 'bullmq';
import {
  EMBED_RESULTS_QUEUE,
  type EmbedResultDispatcher,
  type EmbedResultPayload,
} from '@contexts/ingestion/application/ports';

@Injectable()
export class EmbedResultBullMqDispatcher implements EmbedResultDispatcher {
  constructor(
    @InjectQueue(EMBED_RESULTS_QUEUE)
    private readonly queue: Queue,
  ) {}

  async enqueue(payload: EmbedResultPayload): Promise<void> {
    await this.queue.add('embed-result', payload);
  }
}
