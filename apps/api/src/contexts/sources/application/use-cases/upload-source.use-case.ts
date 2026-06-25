import { okAsync, type Result, type ResultAsync } from '@core/result';
import { APPLICATION_ERROR_KIND } from '@kernels/application';
import {
  ExternalSourceId,
  Source,
  SOURCE_CONTENT_SNAPSHOT_CHANGED_EVENT_NAME,
  SourceSyncJob,
} from '@contexts/sources/domain';
import {
  type SourceFingerprinterError,
  type SourceRepository,
  type SourceRepositoryError,
  type SourceSyncJobRepository,
  type SourceSyncJobRepositoryError,
} from '@contexts/sources/application/ports';
import {
  type SourceContentSnapshotCalculation,
  SourceContentSnapshotCalculator,
} from '../services/source-content-snapshot-calculator.service';
import {
  type UploadSourceFingerprintUnavailableError,
  type UploadSourceSyncError,
  type UploadSourceSyncStateConflictError,
  type UploadSourceSyncUnavailableError,
  type UploadSourceUseCaseError,
} from './upload-source.error';

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

export class UploadSourceUseCase {
  constructor(
    private readonly contentSnapshotCalculator: SourceContentSnapshotCalculator,
    private readonly sources: SourceRepository,
    private readonly syncJobs: SourceSyncJobRepository,
  ) {}

  execute(
    command: UploadSourceCommand,
  ): ResultAsync<UploadSourceResult, UploadSourceUseCaseError> {
    return ExternalSourceId.of(command.externalSourceId)
      .map((externalSourceId) => externalSourceId.value)
      .asyncAndThen((externalSourceId) =>
        this.contentSnapshotCalculator
          .calculate(command.content)
          .mapErr((error) => this.mapFingerprinterError(error))
          .andThen((snapshot) => this.uploadSource(externalSourceId, snapshot)),
      );
  }

  private uploadSource(
    externalSourceId: string,
    snapshot: SourceContentSnapshotCalculation,
  ): ResultAsync<UploadSourceResult, UploadSourceUseCaseError> {
    return this.sources
      .findByExternalSourceId(externalSourceId)
      .mapErr((error) => this.mapSourceSyncPersistenceError(error))
      .andThen((existingSource) =>
        this.syncSource(
          existingSource,
          externalSourceId,
          snapshot,
        ).asyncAndThen((source) => this.persistSourceSync(source)),
      );
  }

  private syncSource(
    existingSource: Source | null,
    externalSourceId: string,
    snapshot: SourceContentSnapshotCalculation,
  ): Result<Source, UploadSourceUseCaseError> {
    if (existingSource) {
      return existingSource.syncContentSnapshot({
        content: snapshot.content,
        fingerprint: snapshot.fingerprint,
        size: snapshot.size,
      });
    }

    return Source.create({
      externalSourceId,
      content: snapshot.content,
      fingerprint: snapshot.fingerprint,
      size: snapshot.size,
    });
  }

  private persistSourceSync(
    source: Source,
  ): ResultAsync<UploadSourceResult, UploadSourceUseCaseError> {
    const contentSnapshotChangedEvent = source.findDomainEvent(
      SOURCE_CONTENT_SNAPSHOT_CHANGED_EVENT_NAME,
    );

    if (!contentSnapshotChangedEvent) {
      return this.completeUploadForUnchangedContentSnapshot(source);
    }

    return SourceSyncJob.create({
      sourceId: contentSnapshotChangedEvent.aggregateId,
      fingerprint: contentSnapshotChangedEvent.fingerprint,
    }).asyncAndThen((syncJob) =>
      this.sources
        .save(source)
        .mapErr((error) => this.mapSourceSyncPersistenceError(error))
        .andThen((savedSource) =>
          this.syncJobs
            .save(syncJob)
            .mapErr((error) => this.mapSourceSyncPersistenceError(error))
            .map((savedSyncJob) => {
              source.clearDomainEvents();

              return this.completeUploadForChangedContentSnapshot(
                savedSource,
                savedSyncJob,
              );
            }),
        ),
    );
  }

  private completeUploadForUnchangedContentSnapshot(
    source: Source,
  ): ResultAsync<UploadSourceResult, UploadSourceUseCaseError> {
    const sourceProps = source.getProps();

    return okAsync({
      sourceId: source.id,
      externalSourceId: sourceProps.externalSourceId.value,
      fingerprint: sourceProps.contentSnapshot.value.fingerprint,
    } satisfies UploadSourceResult);
  }

  private completeUploadForChangedContentSnapshot(
    source: Source,
    syncJob: SourceSyncJob,
  ): UploadSourceResult {
    const sourceProps = source.getProps();

    return {
      sourceId: source.id,
      externalSourceId: sourceProps.externalSourceId.value,
      fingerprint: sourceProps.contentSnapshot.value.fingerprint,
      syncJobId: syncJob.id,
    } satisfies UploadSourceResult;
  }

  private mapFingerprinterError(
    error: SourceFingerprinterError,
  ): UploadSourceFingerprintUnavailableError {
    return {
      kind: APPLICATION_ERROR_KIND.DEPENDENCY_UNAVAILABLE,
      code: 'upload_source.fingerprint_unavailable',
      message: 'Upload source fingerprint is unavailable',
      details: { causeCode: error.code },
    } satisfies UploadSourceFingerprintUnavailableError;
  }

  private mapSourceSyncPersistenceError(
    error: SourceRepositoryError | SourceSyncJobRepositoryError,
  ): UploadSourceSyncError {
    if (error.kind === APPLICATION_ERROR_KIND.STATE_CONFLICT) {
      return {
        kind: APPLICATION_ERROR_KIND.STATE_CONFLICT,
        code: 'upload_source.source_sync_state_conflict',
        message: 'Upload source conflicted with the current source state',
        details: { causeCode: error.code },
      } satisfies UploadSourceSyncStateConflictError;
    }

    return {
      kind: APPLICATION_ERROR_KIND.DEPENDENCY_UNAVAILABLE,
      code: 'upload_source.source_sync_unavailable',
      message: 'Upload source storage is unavailable',
      details: { causeCode: error.code },
    } satisfies UploadSourceSyncUnavailableError;
  }
}
