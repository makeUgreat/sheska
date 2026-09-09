import { Inject, Injectable } from '@nestjs/common';
import { type SourceSyncJobRepository } from '@contexts/sources/domain';
import { SOURCE_SYNC_JOB_REPOSITORY } from '@contexts/sources/sources.di-tokens';

export interface GetSourceSyncJobCommand {
  readonly syncJobId: string;
}

export interface GetSourceSyncJobResult {
  readonly syncJobId: string;
  readonly sourceId: string;
  readonly fingerprint: string;
  readonly status: string;
  readonly totalChunks: number | null;
  readonly processedChunks: number;
  readonly createdAt: Date;
}

@Injectable()
export class GetSourceSyncJobUseCase {
  constructor(
    @Inject(SOURCE_SYNC_JOB_REPOSITORY)
    private readonly syncJobs: SourceSyncJobRepository,
  ) {}

  async execute(
    command: GetSourceSyncJobCommand,
  ): Promise<GetSourceSyncJobResult> {
    const syncJob = await this.syncJobs.get({ id: command.syncJobId });
    const props = syncJob.getProps();
    return {
      syncJobId: syncJob.id,
      sourceId: props.sourceId,
      fingerprint: props.fingerprint.unpack(),
      status: props.status,
      totalChunks: props.totalChunks,
      processedChunks: props.processedChunks,
      createdAt: syncJob.createdAt,
    };
  }
}
