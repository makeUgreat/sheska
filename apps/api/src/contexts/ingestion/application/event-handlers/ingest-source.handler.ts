import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { type EmbedJobDispatcher } from '@contexts/ingestion/application/ports';
import { EMBED_JOB_DISPATCHER } from '@contexts/ingestion/ingestion.di-tokens';

interface SourceSyncJobCreatedDomainEventPayload {
  readonly aggregateId: string;
  readonly sourceId: string;
  readonly content: string;
}

@Injectable()
export class IngestSourceHandler {
  constructor(
    @Inject(EMBED_JOB_DISPATCHER)
    private readonly embedJobDispatcher: EmbedJobDispatcher,
  ) {}

  @OnEvent('source.sync_job.created')
  async handle(event: SourceSyncJobCreatedDomainEventPayload): Promise<void> {
    await this.embedJobDispatcher.dispatch({
      sourceId: event.sourceId,
      syncJobId: event.aggregateId,
      content: event.content,
    });
  }
}
