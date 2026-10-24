import { newId } from '@core/id';
import { AggregateRoot } from '@kernels/domain';
import { SourceFingerprint } from './source-fingerprint.vo';
import {
  SourceSyncJobCreatedDomainEvent,
  type SourceSyncJobDomainEvent,
} from './source-sync-job.event';

interface SourceSyncJobProps {
  sourceId: string;
  fingerprint: SourceFingerprint;
  status: SourceSyncJobStatus;
  totalChunks: number | null;
}

type SourceSyncJobStatus = 'waiting' | 'completed' | 'failed';

export class SourceSyncJob extends AggregateRoot<
  SourceSyncJobProps,
  SourceSyncJobDomainEvent
> {
  static create(params: SourceSyncJobCreateParams): SourceSyncJob {
    const { sourceId, content, fingerprint } = params;

    const syncJob = new SourceSyncJob({
      id: newId(),
      props: {
        sourceId,
        fingerprint,
        status: 'waiting',
        totalChunks: null,
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
        totalChunks: params.totalChunks ?? null,
      },
      createdAt,
    });
  }

  markCompleted(totalChunks: number): void {
    this.props.status = 'completed';
    this.props.totalChunks = totalChunks;
  }

  markFailed(): void {
    this.props.status = 'failed';
  }

  isWaiting(): boolean {
    return this.props.status === 'waiting';
  }

  isWaitingOrCompletedFor(fingerprint: SourceFingerprint): boolean {
    return (
      this.props.status !== 'failed' &&
      this.props.fingerprint.equals(fingerprint)
    );
  }

  public validate(): void {
    if (!SourceSyncJob.isStatus(this.props.status)) {
      throw new Error('Source sync job status is invalid');
    }
  }

  private static isStatus(status: string): status is SourceSyncJobStatus {
    return (
      status === 'waiting' || status === 'completed' || status === 'failed'
    );
  }
}

interface SourceSyncJobCreateParams {
  sourceId: string;
  content: string;
  fingerprint: SourceFingerprint;
}

interface SourceSyncJobRestoreParams {
  id: string;
  sourceId: string;
  fingerprint: string;
  status: string;
  totalChunks?: number | null;
  createdAt?: Date;
}
