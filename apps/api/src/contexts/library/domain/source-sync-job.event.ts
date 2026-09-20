import { DomainEvent, type DomainEventParams } from '@kernels/domain';

interface SourceSyncJobCreatedDomainEventParams extends DomainEventParams {
  readonly sourceId: string;
  readonly content: string;
  readonly fingerprint: string;
}

export class SourceSyncJobCreatedDomainEvent extends DomainEvent {
  readonly eventName = 'source.sync_job.created';
  readonly sourceId: string;
  readonly content: string;
  readonly fingerprint: string;

  constructor(params: SourceSyncJobCreatedDomainEventParams) {
    super(params);
    this.sourceId = params.sourceId;
    this.content = params.content;
    this.fingerprint = params.fingerprint;
  }
}

export type SourceSyncJobDomainEvent = SourceSyncJobCreatedDomainEvent;
