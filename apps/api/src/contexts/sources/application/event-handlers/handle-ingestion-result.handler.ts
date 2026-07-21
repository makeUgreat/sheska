import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { type SourceSyncJobRepository } from '@contexts/sources/domain';
import { SOURCE_SYNC_JOB_REPOSITORY } from '@contexts/sources/sources.di-tokens';

interface IngestionResultDomainEventPayload {
  readonly syncJobId: string;
}

interface IngestionStartedDomainEventPayload {
  readonly syncJobId: string;
  readonly totalChunks: number;
}

interface IngestionProgressDomainEventPayload {
  readonly syncJobId: string;
  readonly processedChunks: number;
}

@Injectable()
export class HandleIngestionResultHandler {
  constructor(
    @Inject(SOURCE_SYNC_JOB_REPOSITORY)
    private readonly syncJobs: SourceSyncJobRepository,
  ) {}

  @OnEvent('source.ingestion.started')
  async onStarted(event: IngestionStartedDomainEventPayload): Promise<void> {
    const syncJob = await this.syncJobs.find({ id: event.syncJobId });
    if (!syncJob) return;
    syncJob.markProcessing(event.totalChunks);
    await this.syncJobs.save(syncJob);
  }

  @OnEvent('source.ingestion.progress')
  async onProgress(event: IngestionProgressDomainEventPayload): Promise<void> {
    const syncJob = await this.syncJobs.find({ id: event.syncJobId });
    if (!syncJob) return;
    syncJob.recordProgress(event.processedChunks);
    await this.syncJobs.save(syncJob);
  }

  @OnEvent('source.ingestion.completed')
  async onCompleted(event: IngestionResultDomainEventPayload): Promise<void> {
    const syncJob = await this.syncJobs.find({ id: event.syncJobId });
    if (!syncJob) return;
    syncJob.markCompleted();
    await this.syncJobs.save(syncJob);
  }

  @OnEvent('source.ingestion.failed')
  async onFailed(event: IngestionResultDomainEventPayload): Promise<void> {
    const syncJob = await this.syncJobs.find({ id: event.syncJobId });
    if (!syncJob) return;
    syncJob.markFailed();
    await this.syncJobs.save(syncJob);
  }
}
