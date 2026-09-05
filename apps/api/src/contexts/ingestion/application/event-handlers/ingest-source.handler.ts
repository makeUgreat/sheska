import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { OnEvent } from '@nestjs/event-emitter';
import { type Queue } from 'bullmq';
import {
  EMBED_REQUESTS_QUEUE,
  type EmbedRequestPayload,
} from '@contexts/ingestion/application/queue-handlers/embed-request.consumer';

interface SourceSyncJobCreatedDomainEventPayload {
  readonly aggregateId: string;
  readonly sourceId: string;
  readonly content: string;
}

@Injectable()
export class IngestSourceHandler {
  constructor(
    @InjectQueue(EMBED_REQUESTS_QUEUE)
    private readonly embedRequestsQueue: Queue,
  ) {}

  @OnEvent('source.sync_job.created')
  async handle(event: SourceSyncJobCreatedDomainEventPayload): Promise<void> {
    await this.embedRequestsQueue.add('embed-request', {
      sourceId: event.sourceId,
      syncJobId: event.aggregateId,
      content: event.content,
    } satisfies EmbedRequestPayload);
  }
}
