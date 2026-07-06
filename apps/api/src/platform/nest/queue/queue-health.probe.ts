import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { type Queue } from 'bullmq';

export const QUEUE_HEALTH_QUEUE = 'health-check';

@Injectable()
export class QueueHealthProbe {
  constructor(
    @InjectQueue(QUEUE_HEALTH_QUEUE)
    private readonly queue: Queue,
  ) {}

  async check(): Promise<void> {
    await this.queue.count();
  }
}
