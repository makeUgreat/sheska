import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { type EmbedRequestDispatcher } from '@contexts/ingestion/application/ports';
import { EMBED_REQUEST_DISPATCHER } from '@contexts/ingestion/ingestion.di-tokens';
import {
  SOURCE_SYNC_JOB_CREATED_EVENT_TYPE,
  sourceSyncJobCreatedIntegrationEventSchema,
} from './schema/source-sync-job-created.integration-event.schema';

@Injectable()
export class SourceSyncJobCreatedIntegrationEventConsumer {
  constructor(
    @Inject(EMBED_REQUEST_DISPATCHER)
    private readonly embedRequestDispatcher: EmbedRequestDispatcher,
  ) {}

  @OnEvent(SOURCE_SYNC_JOB_CREATED_EVENT_TYPE)
  async handle(message: unknown): Promise<void> {
    const event = sourceSyncJobCreatedIntegrationEventSchema.parse(message);

    await this.embedRequestDispatcher.enqueue(event.payload, {
      idempotencyKey: event.eventId,
    });
  }
}
