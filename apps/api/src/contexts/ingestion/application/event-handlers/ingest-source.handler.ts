import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { type EmbedRequestDispatcher } from '@contexts/ingestion/application/ports';
import { EMBED_REQUEST_DISPATCHER } from '@contexts/ingestion/ingestion.di-tokens';

interface SourceSyncJobCreatedDomainEventPayload {
  readonly aggregateId: string;
  readonly sourceId: string;
  readonly content: string;
}

@Injectable()
export class IngestSourceHandler {
  constructor(
    @Inject(EMBED_REQUEST_DISPATCHER)
    private readonly embedRequestDispatcher: EmbedRequestDispatcher,
  ) {}

  @OnEvent('source.sync_job.created')
  async handle(event: SourceSyncJobCreatedDomainEventPayload): Promise<void> {
    await this.embedRequestDispatcher.enqueue({
      sourceId: event.sourceId,
      syncJobId: event.aggregateId,
      content: event.content,
    });
  }
}
