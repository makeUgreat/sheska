import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApplyIngestionUpdateUseCase } from '@contexts/library/application/use-cases/apply-ingestion-update.use-case';
import {
  deadLetteredSyncJobCreatedPayloadSchema,
  outboxDeadLetteredIntegrationEventSchema,
} from './dto/outbox-dead-lettered.integration-event.dto';

@Injectable()
export class OutboxDeadLetteredIntegrationEventConsumer {
  constructor(
    @Inject(ApplyIngestionUpdateUseCase)
    private readonly applyIngestionUpdate: ApplyIngestionUpdateUseCase,
  ) {}

  @OnEvent('outbox.message.dead_lettered')
  async onDeadLettered(message: unknown): Promise<void> {
    const { payload } = outboxDeadLetteredIntegrationEventSchema.parse(message);
    if (payload.deadLetteredEventType !== 'source.sync_job.created') return;

    const { syncJobId } = deadLetteredSyncJobCreatedPayloadSchema.parse(
      payload.deadLetteredPayload,
    );
    await this.applyIngestionUpdate.execute({ kind: 'failed', syncJobId });
  }
}
