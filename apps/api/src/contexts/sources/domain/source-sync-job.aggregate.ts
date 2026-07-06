import { AggregateRoot, newId } from '@kernels/domain';
import { SourceFingerprint } from './source-fingerprint.vo';
import { SourceSyncJobCreatedDomainEvent } from './source-sync-job-created.event';

interface SourceSyncJobProps {
  sourceId: string;
  fingerprint: SourceFingerprint;
  status: SourceSyncJobStatus;
}

type SourceSyncJobStatus = 'pending' | 'completed' | 'failed';

interface SourceSyncJobCreateParams {
  sourceId: string;
  content: string;
  fingerprint: string;
}

interface SourceSyncJobRestoreParams {
  id: string;
  sourceId: string;
  fingerprint: string;
  status: string;
  createdAt?: Date;
}

export class SourceSyncJob extends AggregateRoot<SourceSyncJobProps> {
  static create(params: SourceSyncJobCreateParams): SourceSyncJob {
    const { sourceId, content, fingerprint } = params;

    const syncJob = new SourceSyncJob({
      id: newId(),
      props: {
        sourceId,
        fingerprint: SourceFingerprint.of(fingerprint),
        status: 'pending',
      },
    });

    syncJob.addEvent(
      new SourceSyncJobCreatedDomainEvent({
        aggregateId: syncJob.id,
        sourceId,
        content,
        fingerprint: syncJob.props.fingerprint.unpack(),
      }),
    );

    return syncJob;
  }

  static restore(params: SourceSyncJobRestoreParams): SourceSyncJob {
    const { id, sourceId, fingerprint, status, createdAt } = params;

    return new SourceSyncJob({
      id,
      props: {
        sourceId,
        fingerprint: SourceFingerprint.of(fingerprint),
        status: status as SourceSyncJobStatus,
      },
      createdAt,
    });
  }

  markCompleted(): void {
    this.props.status = 'completed';
  }

  markFailed(): void {
    this.props.status = 'failed';
  }

  public validate(): void {
    if (!SourceSyncJob.isStatus(this.props.status)) {
      throw new Error('Source sync job status is invalid');
    }
  }

  private static isStatus(status: string): status is SourceSyncJobStatus {
    return status === 'pending' || status === 'completed' || status === 'failed';
  }
}
