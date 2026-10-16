import { Inject, Injectable } from '@nestjs/common';
import {
  ExternalSourceId,
  Source,
  SourceSyncJob,
  type SourceLink,
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/library/domain';
import {
  SourceContentSnapshotCalculator,
  type SourceContentSnapshotCalculation,
} from '../services/source-content-snapshot-calculator.service';
import {
  type LibraryUnitOfWork,
  type LibraryUnitOfWorkResources,
} from '@contexts/library/application/ports';
import { SourceSyncJobCreatedIntegrationEvent } from '@contexts/library/application/events/source-sync-job-created.integration-event';
import {
  SOURCE_REPOSITORY,
  SOURCE_SYNC_JOB_REPOSITORY,
  LIBRARY_UNIT_OF_WORK,
} from '@contexts/library/library.di-tokens';

export interface UploadSourceCommand {
  readonly externalSourceId: string;
  readonly content: string;
  readonly links: readonly SourceLink[];
}

export interface UploadSourceResult {
  readonly sourceId: string;
  readonly externalSourceId: string;
  readonly fingerprint: string;
  readonly syncJobId?: string;
}

type ReceivedSnapshot = SourceContentSnapshotCalculation & {
  readonly links: readonly SourceLink[];
};

type SourceWrite = 'insert' | 'update';

type EmbeddingDecision =
  | { kind: 'create'; pendingSyncJob?: undefined }
  | { kind: 'none'; pendingSyncJob?: undefined }
  | { kind: 'pending'; pendingSyncJob: SourceSyncJob };

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
    const snapshot: ReceivedSnapshot = {
      ...(await this.contentSnapshotCalculator.calculate(command.content)),
      links: command.links,
    };
    const existing = await this.sources.find({ externalSourceId });

    const source = existing ?? Source.create({ externalSourceId, ...snapshot });
    const sourceWrite = this.decideSourceWrite(existing, snapshot);
    const embedding = await this.decideEmbedding(existing, snapshot);

    if (!sourceWrite && embedding.kind !== 'create') {
      return this.completeUpload(source, embedding.pendingSyncJob);
    }
    return this.persist(source, sourceWrite, embedding);
  }

  private decideSourceWrite(
    existing: Source | null,
    snapshot: ReceivedSnapshot,
  ): SourceWrite | null {
    if (!existing) return 'insert';
    return existing.syncContentSnapshot(snapshot).changed ? 'update' : null;
  }

  private async decideEmbedding(
    existing: Source | null,
    { fingerprint }: ReceivedSnapshot,
  ): Promise<EmbeddingDecision> {
    if (!existing) return { kind: 'create' };

    const latestSyncJob = await this.syncJobs.findLatest({
      sourceId: existing.id,
    });
    if (latestSyncJob?.isCompletedFor(fingerprint)) return { kind: 'none' };
    if (latestSyncJob?.isActiveFor(fingerprint)) {
      return { kind: 'pending', pendingSyncJob: latestSyncJob };
    }
    return { kind: 'create' };
  }

  private async persist(
    source: Source,
    sourceWrite: SourceWrite | null,
    embedding: EmbeddingDecision,
  ): Promise<UploadSourceResult> {
    const syncJob =
      embedding.kind === 'create' ? this.createSyncJob(source) : null;
    const integrationEvents = syncJob ? this.toIntegrationEvents(syncJob) : [];

    const result = await this.unitOfWork.execute(async (resources) => {
      const savedSource = await this.writeSource(
        resources,
        source,
        sourceWrite,
      );
      const savedSyncJob = syncJob
        ? await resources.syncJobs.insert(syncJob)
        : embedding.pendingSyncJob;

      for (const integrationEvent of integrationEvents) {
        await resources.outbox.append(integrationEvent);
      }

      return this.completeUpload(savedSource, savedSyncJob);
    });

    syncJob?.clearDomainEvents();

    return result;
  }

  private writeSource(
    resources: LibraryUnitOfWorkResources,
    source: Source,
    sourceWrite: SourceWrite | null,
  ): Promise<Source> {
    if (sourceWrite === 'insert') return resources.sources.insert(source);
    if (sourceWrite === 'update') return resources.sources.update(source);
    return Promise.resolve(source);
  }

  private createSyncJob(source: Source): SourceSyncJob {
    const { body, fingerprint } = source.getProps().contentSnapshot.unpack();

    return SourceSyncJob.create({
      sourceId: source.id,
      fingerprint: fingerprint.unpack(),
      content: body,
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

  private completeUpload(
    source: Source,
    syncJob?: SourceSyncJob,
  ): UploadSourceResult {
    const { externalSourceId, contentSnapshot } = source.getProps();

    return {
      sourceId: source.id,
      externalSourceId: externalSourceId.unpack(),
      fingerprint: contentSnapshot.unpack().fingerprint.unpack(),
      syncJobId: syncJob?.id,
    };
  }
}
