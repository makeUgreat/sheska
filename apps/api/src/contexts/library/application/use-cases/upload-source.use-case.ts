import { Inject, Injectable } from '@nestjs/common';
import {
  ExternalSourceId,
  Source,
  SourceSyncJob,
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/library/domain';
import {
  SourceContentSnapshotCalculator,
  type SourceContentSnapshotCalculation,
} from '../services/source-content-snapshot-calculator.service';
import { type LibraryUnitOfWork } from '@contexts/library/application/ports';
import { SourceSyncJobCreatedIntegrationEvent } from '@contexts/library/application/events/source-sync-job-created.integration-event';
import {
  SOURCE_REPOSITORY,
  SOURCE_SYNC_JOB_REPOSITORY,
  LIBRARY_UNIT_OF_WORK,
} from '@contexts/library/library.di-tokens';

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
    @Inject(LIBRARY_UNIT_OF_WORK)
    private readonly unitOfWork: LibraryUnitOfWork,
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

    return this.persistChange(source);
  }

  private async persistChange(source: Source): Promise<UploadSourceResult> {
    const { body, fingerprint } = source.getProps().contentSnapshot.unpack();

    const syncJob = SourceSyncJob.create({
      sourceId: source.id,
      fingerprint,
      content: body,
    });
    const integrationEvents = syncJob.domainEvents.map(
      (event) =>
        new SourceSyncJobCreatedIntegrationEvent({
          occurredAt: event.occurredAt,
          sourceId: event.sourceId,
          syncJobId: event.aggregateId,
          content: event.content,
        }),
    );

    const result = await this.unitOfWork.execute(async (resources) => {
      const savedSource = await resources.sources.save(source);
      const savedSyncJob = await resources.syncJobs.save(syncJob);

      for (const integrationEvent of integrationEvents) {
        await resources.outbox.append(integrationEvent);
      }

      return this.completeUpload(savedSource, savedSyncJob);
    });

    syncJob.clearDomainEvents();

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
