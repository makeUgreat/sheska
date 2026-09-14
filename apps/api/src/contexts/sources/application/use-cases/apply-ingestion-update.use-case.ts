import { Inject, Injectable } from '@nestjs/common';
import { type SourceSyncJobRepository } from '@contexts/sources/domain';
import { SOURCE_SYNC_JOB_REPOSITORY } from '@contexts/sources/sources.di-tokens';

export type ApplyIngestionUpdateCommand =
  | {
      readonly kind: 'started';
      readonly syncJobId: string;
      readonly totalChunks: number;
    }
  | {
      readonly kind: 'progress';
      readonly syncJobId: string;
      readonly processedChunks: number;
    }
  | { readonly kind: 'completed'; readonly syncJobId: string }
  | { readonly kind: 'failed'; readonly syncJobId: string };

@Injectable()
export class ApplyIngestionUpdateUseCase {
  constructor(
    @Inject(SOURCE_SYNC_JOB_REPOSITORY)
    private readonly syncJobs: SourceSyncJobRepository,
  ) {}

  async execute(command: ApplyIngestionUpdateCommand): Promise<void> {
    const syncJob = await this.syncJobs.find({ id: command.syncJobId });
    if (!syncJob) return;

    switch (command.kind) {
      case 'started':
        syncJob.markProcessing(command.totalChunks);
        break;
      case 'progress':
        syncJob.recordProgress(command.processedChunks);
        break;
      case 'completed':
        syncJob.markCompleted();
        break;
      case 'failed':
        syncJob.markFailed();
        break;
    }

    await this.syncJobs.save(syncJob);
  }
}
