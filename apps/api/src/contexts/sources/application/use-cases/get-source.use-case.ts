import { Inject, Injectable } from '@nestjs/common';
import {
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/sources/domain';
import {
  APPLICATION_ERROR_KIND,
  ApplicationException,
} from '@kernels/application';
import {
  SOURCE_REPOSITORY,
  SOURCE_SYNC_JOB_REPOSITORY,
  SOURCE_EMBEDDING_LOOKUP,
} from '@contexts/sources/sources.di-tokens';
import {
  type SourceEmbeddingLookup,
  type EmbeddingInfo,
} from '@contexts/sources/application/ports';

export interface GetSourceCommand {
  readonly sourceId: string;
}

export interface GetSourceResult {
  readonly sourceId: string;
  readonly externalSourceId: string;
  readonly content: string;
  readonly fingerprint: string;
  readonly sizeBytes: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly latestSyncJob: {
    readonly syncJobId: string;
    readonly status: string;
    readonly createdAt: Date;
  } | null;
  readonly embedding: EmbeddingInfo | null;
}

@Injectable()
export class GetSourceUseCase {
  constructor(
    @Inject(SOURCE_REPOSITORY)
    private readonly sources: SourceRepository,
    @Inject(SOURCE_SYNC_JOB_REPOSITORY)
    private readonly syncJobs: SourceSyncJobRepository,
    @Inject(SOURCE_EMBEDDING_LOOKUP)
    private readonly embeddingLookup: SourceEmbeddingLookup,
  ) {}

  async execute(command: GetSourceCommand): Promise<GetSourceResult> {
    const source = await this.sources.get({ id: command.sourceId });

    if (!source) {
      throw new ApplicationException({
        kind: APPLICATION_ERROR_KIND.NOT_FOUND,
        code: 'sources.source_not_found',
        message: 'Source not found',
        details: {},
      });
    }

    const props = source.getProps();
    const snapshot = props.contentSnapshot.unpack();

    const [latestJob, embedding] = await Promise.all([
      this.syncJobs.findLatestBySourceId({ sourceId: source.id }),
      this.embeddingLookup.findBySourceId({ sourceId: source.id }),
    ]);

    return {
      sourceId: source.id,
      externalSourceId: props.externalSourceId.unpack(),
      content: snapshot.content,
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
      embedding,
    };
  }
}
