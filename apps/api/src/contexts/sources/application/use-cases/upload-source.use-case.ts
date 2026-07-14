import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LOGGER, type LoggerPort } from '@kernels/application';
import {
  ExternalSourceId,
  Source,
  SourceSyncJob,
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/sources/domain';
import {
  SourceContentSnapshotCalculator,
  type SourceContentSnapshotCalculation,
} from '../services/source-content-snapshot-calculator.service';
import {
  SOURCE_REPOSITORY,
  SOURCE_SYNC_JOB_REPOSITORY,
  SOURCE_EMBEDDING_LOOKUP,
} from '@contexts/sources/sources.di-tokens';
import type { SourceEmbeddingLookup } from '@contexts/sources/application/ports';

export interface UploadSourceCommand {
  readonly externalSourceId: string;
  readonly content: string;
}

export interface UploadSourceResult {
  readonly sourceId: string;
  readonly externalSourceId: string;
  readonly fingerprint: string;
  readonly syncJobId?: string;
}

export interface UploadSourceContentSnapshotCalculator {
  calculate(content: string): Promise<SourceContentSnapshotCalculation>;
}

@Injectable()
export class UploadSourceUseCase {
  constructor(
    @Inject(SourceContentSnapshotCalculator)
    private readonly contentSnapshotCalculator: UploadSourceContentSnapshotCalculator,
    @Inject(SOURCE_REPOSITORY)
    private readonly sources: SourceRepository,
    @Inject(SOURCE_SYNC_JOB_REPOSITORY)
    private readonly syncJobs: SourceSyncJobRepository,
    private readonly eventEmitter: EventEmitter2,
    @Inject(LOGGER)
    private readonly logger: LoggerPort,
    @Inject(SOURCE_EMBEDDING_LOOKUP)
    private readonly embeddingLookup: SourceEmbeddingLookup,
  ) {}

  async execute(command: UploadSourceCommand): Promise<UploadSourceResult> {
    const externalSourceId = ExternalSourceId.of(
      command.externalSourceId,
    ).unpack();
    const snapshot = await this.contentSnapshotCalculator.calculate(
      command.content,
    );
    const source = await this.sources.find({ externalSourceId });

    if (!source) {
      return this.persistChange(
        Source.create({ externalSourceId, ...snapshot }),
        command.content,
      );
    }

    const { changed } = source.syncContentSnapshot(snapshot);
    if (!changed) {
      const embedding = await this.embeddingLookup.findBySourceId({
        sourceId: source.id,
      });
      if (embedding) return this.completeUpload(source);
    }

    return this.persistChange(source, command.content);
  }

  private async persistChange(
    source: Source,
    content: string,
  ): Promise<UploadSourceResult> {
    const { fingerprint } = source.getProps().contentSnapshot.unpack();

    const syncJob = SourceSyncJob.create({
      sourceId: source.id,
      fingerprint,
      content,
    });

    const savedSource = await this.sources.save(source);
    const savedSyncJob = await this.syncJobs.save(syncJob);

    await syncJob.publishEvents(this.logger, this.eventEmitter);

    return this.completeUpload(savedSource, savedSyncJob);
  }

  private completeUpload(
    source: Source,
    syncJob?: SourceSyncJob,
  ): UploadSourceResult {
    const { externalSourceId, contentSnapshot } = source.getProps();

    return {
      sourceId: source.id,
      externalSourceId: externalSourceId.unpack(),
      fingerprint: contentSnapshot.unpack().fingerprint,
      syncJobId: syncJob?.id,
    };
  }
}
