import { Inject, Injectable } from '@nestjs/common';
import { type SourceSyncJobRepository } from '@contexts/library/domain';
import { SOURCE_SYNC_JOB_REPOSITORY } from '@contexts/library/library.di-tokens';

export type ApplyIngestionUpdateCommand =
  | {
      readonly kind: 'completed';
      readonly syncJobId: string;
      readonly totalChunks: number;
    }
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
      case 'completed':
        syncJob.markCompleted(command.totalChunks);
        break;
      case 'failed':
        syncJob.markFailed();
        break;
    }

    await this.syncJobs.update(syncJob);
  }
}
