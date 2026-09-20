import { Inject, Injectable } from '@nestjs/common';
import { LOGGER, type LoggerPort } from '@kernels/application';
import { type SyncJobProgressLookup } from '@contexts/library/application/ports';
import { type SourceSyncJobRepository } from '@contexts/library/domain';
import {
  SOURCE_SYNC_JOB_REPOSITORY,
  SYNC_JOB_PROGRESS_LOOKUP,
} from '@contexts/library/library.di-tokens';

export interface GetSourceSyncJobCommand {
  readonly syncJobId: string;
}

export interface GetSourceSyncJobResult {
  readonly syncJobId: string;
  readonly sourceId: string;
  readonly fingerprint: string;
  readonly status: string;
  readonly totalChunks: number | null;
  readonly processedChunks: number | null;
  readonly createdAt: Date;
}

@Injectable()
export class GetSourceSyncJobUseCase {
  constructor(
    @Inject(SOURCE_SYNC_JOB_REPOSITORY)
    private readonly syncJobs: SourceSyncJobRepository,
    @Inject(SYNC_JOB_PROGRESS_LOOKUP)
    private readonly progress: SyncJobProgressLookup,
    @Inject(LOGGER)
    private readonly logger: LoggerPort,
  ) {}

  async execute(
    command: GetSourceSyncJobCommand,
  ): Promise<GetSourceSyncJobResult> {
    const [syncJob, liveProgress] = await Promise.all([
      this.syncJobs.get({ id: command.syncJobId }),
      this.findLiveProgress(command.syncJobId),
    ]);
    const props = syncJob.getProps();
    const isProcessing = props.status === 'waiting' && liveProgress !== null;
    return {
      syncJobId: syncJob.id,
      sourceId: props.sourceId,
      fingerprint: props.fingerprint.unpack(),
      status: isProcessing ? 'processing' : props.status,
      totalChunks: liveProgress?.totalChunks ?? props.totalChunks,
      processedChunks: liveProgress?.processedChunks ?? null,
      createdAt: syncJob.createdAt,
    };
  }

  private async findLiveProgress(syncJobId: string) {
    try {
      return await this.progress.find({ syncJobId });
    } catch (error: unknown) {
      this.logger.warn('Failed to read live sync job progress', error, {
        syncJobId,
      });
      return null;
    }
  }
}
