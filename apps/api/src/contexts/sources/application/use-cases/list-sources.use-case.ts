import { Inject, Injectable } from '@nestjs/common';
import {
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/sources/domain';
import {
  SOURCE_REPOSITORY,
  SOURCE_SYNC_JOB_REPOSITORY,
} from '@contexts/sources/sources.di-tokens';

export interface ListSourcesCommand {
  readonly pagination?: {
    readonly page: number;
    readonly limit: number;
  };
}

export interface ListSourcesResultItem {
  readonly sourceId: string;
  readonly externalSourceId: string;
  readonly fingerprint: string;
  readonly sizeBytes: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly latestSyncJob: {
    readonly syncJobId: string;
    readonly status: string;
    readonly createdAt: Date;
  } | null;
}

export interface ListSourcesResult {
  readonly sources: ReadonlyArray<ListSourcesResultItem>;
}

@Injectable()
export class ListSourcesUseCase {
  constructor(
    @Inject(SOURCE_REPOSITORY)
    private readonly sources: SourceRepository,
    @Inject(SOURCE_SYNC_JOB_REPOSITORY)
    private readonly syncJobs: SourceSyncJobRepository,
  ) {}

  async execute(_command: ListSourcesCommand = {}): Promise<ListSourcesResult> {
    const sources = await this.sources.list();

    const items = await Promise.all(
      sources.map(async (source) => {
        const props = source.getProps();
        const snapshot = props.contentSnapshot.unpack();
        const latestJob = await this.syncJobs.findLatestBySourceId({
          sourceId: source.id,
        });

        return {
          sourceId: source.id,
          externalSourceId: props.externalSourceId.unpack(),
          fingerprint: snapshot.fingerprint,
          sizeBytes: snapshot.size,
          createdAt: source.createdAt,
          updatedAt: source.updatedAt,
          latestSyncJob: latestJob
            ? {
                syncJobId: latestJob.id,
                status: latestJob.getProps().status,
                createdAt: latestJob.createdAt,
              }
            : null,
        };
      }),
    );

    return { sources: items };
  }
}
