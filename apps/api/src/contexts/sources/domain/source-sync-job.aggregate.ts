import { AggregateRoot, newId } from '@kernels/domain';
import { SourceFingerprint } from './source-fingerprint.vo';

interface SourceSyncJobProps {
  sourceId: string;
  fingerprint: SourceFingerprint;
  status: SourceSyncJobStatus;
}

type SourceSyncJobStatus = 'pending';

interface SourceSyncJobCreateParams {
  sourceId: string;
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
    const { sourceId, fingerprint } = params;

    return new SourceSyncJob({
      id: newId(),
      props: {
        sourceId,
        fingerprint: SourceFingerprint.of(fingerprint),
        status: 'pending',
      },
    });
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

  public validate(): void {
    if (!SourceSyncJob.isStatus(this.props.status)) {
      throw new Error('Source sync job status is invalid');
    }
  }

  private static isStatus(status: string): status is SourceSyncJobStatus {
    return status === 'pending';
  }
}
