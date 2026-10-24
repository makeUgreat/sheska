import { Inject, Injectable } from '@nestjs/common';
import { ValidationFailedError } from '@core/errors';
import {
  ExternalSourceId,
  Source,
  SourceFrontmatter,
  type SourceSyncJob,
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
  calculate(content: string): SourceContentSnapshotCalculation;
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
    const snapshot = this.contentSnapshotCalculator.calculate(command.content);
    this.ensureSyncTarget(snapshot);

    const existingSource = await this.sources.find({ externalSourceId });
    const changes = existingSource
      ? await this.syncSource(existingSource, snapshot)
      : this.createSource(externalSourceId, snapshot);

    await this.persist(changes);
    return this.toResult(changes);
  }

  private createSource(
    externalSourceId: string,
    snapshot: SourceContentSnapshotCalculation,
  ): UploadChanges {
    const source = Source.create({ externalSourceId, ...snapshot });

    return {
      source,
      sourceWrite: 'insert',
      syncJob: source.syncJobFor(null),
      isNewSyncJob: true,
    };
  }

  private async syncSource(
    source: Source,
    snapshot: SourceContentSnapshotCalculation,
  ): Promise<UploadChanges> {
    const sourceChanged = source.syncContent(snapshot);
    const latestSyncJob = await this.syncJobs.findLatest({
      sourceId: source.id,
    });

    const syncJob = source.syncJobFor(latestSyncJob);

    return {
      source,
      sourceWrite: sourceChanged ? 'update' : null,
      syncJob,
      isNewSyncJob: syncJob !== latestSyncJob,
    };
  }

  private async persist({
    source,
    sourceWrite,
    syncJob,
    isNewSyncJob,
  }: UploadChanges): Promise<void> {
    if (sourceWrite === null && !isNewSyncJob) return;

    await this.unitOfWork.execute(async (resources) => {
      if (sourceWrite === 'insert') await resources.sources.insert(source);
      if (sourceWrite === 'update') await resources.sources.update(source);
      if (isNewSyncJob) {
        await resources.syncJobs.insert(syncJob);
        for (const integrationEvent of this.toIntegrationEvents(syncJob)) {
          await resources.outbox.append(integrationEvent);
        }
      }
    });

    if (isNewSyncJob) syncJob.clearDomainEvents();
  }

  private toResult({ source, syncJob }: UploadChanges): UploadSourceResult {
    const { externalSourceId, body } = source.getProps();

    return {
      sourceId: source.id,
      externalSourceId: externalSourceId.unpack(),
      fingerprint: body.unpack().fingerprint.unpack(),
      syncJobId: syncJob.isWaiting() ? syncJob.id : undefined,
    };
  }

  private ensureSyncTarget(snapshot: SourceContentSnapshotCalculation): void {
    if (SourceFrontmatter.of(snapshot.frontmatter).isSyncTarget()) return;

    throw new ValidationFailedError({
      code: 'source.not_sync_target',
      message:
        'Only a file whose frontmatter has `sheska: true` can be uploaded',
      details: {
        fields: [{ path: 'frontmatter.sheska', messages: ['must be true'] }],
      },
    });
  }

  private toIntegrationEvents(
    syncJob: SourceSyncJob,
  ): SourceSyncJobCreatedIntegrationEvent[] {
    return syncJob.domainEvents.map(
      (event) =>
        new SourceSyncJobCreatedIntegrationEvent({
          occurredAt: event.occurredAt,
          sourceId: event.sourceId,
          syncJobId: event.aggregateId,
          content: event.content,
        }),
    );
  }
}

interface UploadChanges {
  source: Source;
  sourceWrite: 'insert' | 'update' | null;
  syncJob: SourceSyncJob;
  isNewSyncJob: boolean;
}
