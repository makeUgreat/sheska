import { AggregateRoot, newId } from '@kernels/domain';
import { SourceFingerprint } from './source-fingerprint.vo';
import { SourceSyncJobCreatedDomainEvent } from './source-sync-job.event';

interface SourceSyncJobProps {
  sourceId: string;
  fingerprint: SourceFingerprint;
  status: SourceSyncJobStatus;
  totalChunks: number | null;
  processedChunks: number;
}

type SourceSyncJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

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
  totalChunks?: number | null;
  processedChunks?: number;
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
        totalChunks: null,
        processedChunks: 0,
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
        processedChunks: params.processedChunks ?? 0,
      },
      createdAt,
    });
  }

  markProcessing(totalChunks: number): void {
    this.props.status = 'processing';
    this.props.totalChunks = totalChunks;
    this.props.processedChunks = 0;
  }

  recordProgress(processedChunks: number): void {
    this.props.processedChunks = processedChunks;
    this.validate();
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
    if (this.props.processedChunks < 0) {
      throw new Error('Source sync job processed chunk count is invalid');
    }
    if (
      this.props.totalChunks !== null &&
      this.props.processedChunks > this.props.totalChunks
    ) {
      throw new Error(
        'Source sync job processed chunk count exceeds total chunks',
      );
    }
  }

  private static isStatus(status: string): status is SourceSyncJobStatus {
    return (
      status === 'pending' ||
      status === 'processing' ||
      status === 'completed' ||
      status === 'failed'
    );
  }
}
