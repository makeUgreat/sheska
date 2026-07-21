import { Inject, Injectable } from '@nestjs/common';
import {
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/sources/domain';
import {
  SOURCE_REPOSITORY,
  SOURCE_SYNC_JOB_REPOSITORY,
  SOURCE_EMBEDDING_LOOKUP,
  SOURCE_QUERY,
} from '@contexts/sources/sources.di-tokens';
import {
  type SourceEmbeddingLookup,
  type EmbeddingInfo,
  type SourceQuery,
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
    readonly totalChunks: number | null;
    readonly processedChunks: number;
    readonly createdAt: Date;
  } | null;
  readonly embedding: EmbeddingInfo | null;
  readonly publishedPostId: string | null;
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
    @Inject(SOURCE_QUERY)
    private readonly sourceQuery: SourceQuery,
  ) {}

  async execute(command: GetSourceCommand): Promise<GetSourceResult> {
    const source = await this.sources.get({ id: command.sourceId });
    const props = source.getProps();
    const snapshot = props.contentSnapshot.unpack();

    const [latestJob, embedding, publishedPostId] = await Promise.all([
      this.syncJobs.findLatest({ sourceId: source.id }),
      this.embeddingLookup.find({ sourceId: source.id }),
      this.sourceQuery.find({ sourceId: source.id }),
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
            totalChunks: latestJob.getProps().totalChunks,
            processedChunks: latestJob.getProps().processedChunks,
            createdAt: latestJob.createdAt,
          }
        : null,
      embedding,
      publishedPostId,
    };
  }
}
