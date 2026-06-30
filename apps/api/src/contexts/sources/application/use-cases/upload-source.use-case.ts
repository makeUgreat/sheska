import { fromSafePromise, type ResultAsync } from '@core/result';
import {
  ExternalSourceId,
  Source,
  SourceSyncJob,
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/sources/domain';
import { type SourceFingerprinterFailure } from '@contexts/sources/application/ports';
import { type SourceContentSnapshotCalculation } from '../services/source-content-snapshot-calculator.service';
import { type UploadSourceUseCaseFailure } from './upload-source.failure';

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
  calculate(
    content: string,
  ): ResultAsync<SourceContentSnapshotCalculation, SourceFingerprinterFailure>;
}

export class UploadSourceUseCase {
  constructor(
    private readonly contentSnapshotCalculator: UploadSourceContentSnapshotCalculator,
    private readonly sources: SourceRepository,
    private readonly syncJobs: SourceSyncJobRepository,
  ) {}

  execute(
    command: UploadSourceCommand,
  ): ResultAsync<UploadSourceResult, UploadSourceUseCaseFailure> {
    const externalSourceId = ExternalSourceId.of(
      command.externalSourceId,
    ).unpack();

    return this.contentSnapshotCalculator
      .calculate(command.content)
      .andThen((snapshot) =>
        fromSafePromise(
          this.sources
            .find({ externalSourceId })
            .then((existingSource) =>
              this.persistSourceSync(
                this.syncSource(existingSource, externalSourceId, snapshot),
              ),
            ),
        ),
      );
  }

  private syncSource(
    existingSource: Source | null,
    externalSourceId: string,
    snapshot: SourceContentSnapshotCalculation,
  ): Source {
    if (existingSource) {
      return existingSource.syncContentSnapshot({
        content: snapshot.content,
        fingerprint: snapshot.fingerprint,
      });
    }

    return Source.create({
      externalSourceId,
      content: snapshot.content,
      fingerprint: snapshot.fingerprint,
    });
  }

  private async persistSourceSync(source: Source): Promise<UploadSourceResult> {
    const contentSnapshotChangedEvent = source.findEvent(
      'source.content_snapshot.changed',
    );

    if (!contentSnapshotChangedEvent) {
      return this.completeUploadForUnchangedContentSnapshot(source);
    }

    const syncJob = SourceSyncJob.create({
      sourceId: contentSnapshotChangedEvent.aggregateId,
      fingerprint: contentSnapshotChangedEvent.fingerprint,
    });

    const savedSource = await this.sources.save(source);
    const savedSyncJob = await this.syncJobs.save(syncJob);

    source.clearEvents();

    return this.completeUploadForChangedContentSnapshot(
      savedSource,
      savedSyncJob,
    );
  }

  private completeUploadForUnchangedContentSnapshot(source: Source) {
    const sourceProps = source.getProps();
    const contentSnapshot = sourceProps.contentSnapshot.unpack();

    return {
      sourceId: source.id,
      externalSourceId: sourceProps.externalSourceId.unpack(),
      fingerprint: contentSnapshot.fingerprint,
    } satisfies UploadSourceResult;
  }

  private completeUploadForChangedContentSnapshot(
    source: Source,
    syncJob: SourceSyncJob,
  ) {
    const sourceProps = source.getProps();
    const contentSnapshot = sourceProps.contentSnapshot.unpack();

    return {
      sourceId: source.id,
      externalSourceId: sourceProps.externalSourceId.unpack(),
      fingerprint: contentSnapshot.fingerprint,
      syncJobId: syncJob.id,
    } satisfies UploadSourceResult;
  }
}
