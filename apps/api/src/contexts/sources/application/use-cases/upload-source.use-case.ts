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
import { type SourcesUnitOfWork } from '@contexts/sources/application/ports';
import {
  SOURCE_REPOSITORY,
  SOURCE_SYNC_JOB_REPOSITORY,
  SOURCES_UNIT_OF_WORK,
} from '@contexts/sources/sources.di-tokens';

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
    @Inject(SOURCES_UNIT_OF_WORK)
    private readonly unitOfWork: SourcesUnitOfWork,
    private readonly eventEmitter: EventEmitter2,
    @Inject(LOGGER)
    private readonly logger: LoggerPort,
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
      const latestSyncJob = await this.syncJobs.findLatest({
        sourceId: source.id,
      });
      if (latestSyncJob?.isCompleted()) return this.completeUpload(source);
      if (latestSyncJob?.isActiveFor(snapshot.fingerprint)) {
        return this.completeUpload(source, latestSyncJob);
      }
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

    const result = await this.unitOfWork.execute(async (resources) => {
      const savedSource = await resources.sources.save(source);
      const savedSyncJob = await resources.syncJobs.save(syncJob);

      return this.completeUpload(savedSource, savedSyncJob);
    });

    await syncJob.publishEvents(this.logger, this.eventEmitter);

    return result;
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
